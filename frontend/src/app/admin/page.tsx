'use client';

import AdminProfilePage from './profile/page';
import StaffProfilePage from './staff-profile/page';
import PAProfilePage from './pa-profile/page';
import { useState, useEffect, useMemo, useRef } from 'react';
import AdminResourcesTab from '@/components/AdminResourcesTab';
import { useStates } from '@/hooks/useStates';
import { useCities } from '@/hooks/useCities';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';
import { Save, Upload, Tag, Sun, Moon, FileText, FileCheck, Database, Download, Edit3, Trash2, Shield, Eye, TrendingUp, Clock, Plus, Filter, Users, X, Check, Search, DownloadCloud, Menu, UploadCloud, File, AlertTriangle, AlertCircle, RotateCcw, Building, Lock, Landmark, User, ClipboardList, CheckCircle, CheckCircle2, RefreshCw, LogOut, ShieldCheck, CheckSquare, Layers, Loader2, ArrowRight, Edit2, RotateCcw as RotateCcwIcon, Settings, Activity, LifeBuoy, CreditCard, ExternalLink, Smartphone, ChevronRight, ChevronLeft, EyeOff, LayoutGrid, Table as TableIcon } from 'lucide-react';
import api from '../../services/api';
import ActiveClientSummary from './ActiveClientSummary';
import PagesManagement from '../../components/admin/PagesManagement';
import TicketManagement from '../../components/admin/TicketManagement';
import ComplaintReportAdmin from '../../components/admin/ComplaintReportAdmin';
import { formatPan, formatAadhaar } from '../../utils/formatters';
import SignalManagement from '../../components/SignalManagement';
import AdminResearchReports from '../../components/admin/AdminResearchReports';
import CustomPageView from '../../components/client/CustomPageView';
import Legal from '../../components/client/Legal';
import MobilePreview from '../../components/MobilePreview';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/ui/Pagination';
import { PaginatedList } from '../../components/ui/PaginatedList';
import dynamic from 'next/dynamic';
import { generatePeriodicReport } from '@/utils/generatePeriodicReport';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip } from 'recharts';

const CKEditor = dynamic(() => import('@ckeditor/ckeditor5-react').then(mod => mod.CKEditor), { ssr: false });
let ClassicEditor: any;
if (typeof window !== 'undefined') {
  ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
}


const formatAlertDescription = (description: string) => {
  if (!description) return null;
  const highlightRegex = /(\(Expiry Date: \d{2}\/\d{2}\/\d{4}\)|\(valid until: [^\)]+\)|\d+ day\(s\)|\d+ days)/gi;
  const tokens = description.split(highlightRegex);
  return tokens.map((token, i) => {
    if (token.match(/\(Expiry Date: \d{2}\/\d{2}\/\d{4}\)/i) || token.match(/\(valid until: [^\)]+\)/i)) {
      return (
        <span key={i} className="font-extrabold text-slate-900 dark:text-white bg-slate-300 dark:bg-white/20 px-2 py-0.5 rounded border border-slate-400 dark:border-white/30 shadow-md inline-block my-1 font-mono">
          {token}
        </span>
      );
    } else if (token.match(/\d+ day\(s\)/i) || token.match(/\d+ days/i)) {
      return (
        <strong key={i} className="text-slate-900 dark:text-white font-extrabold underline decoration-white/40 decoration-2">
          {token}
        </strong>
      );
    }
    return <span key={i}>{token}</span>;
  });
};

// =============================================================================
// CENTRALIZED NAV + PERMISSIONS CONFIG
// Add a new module here and it will AUTOMATICALLY appear in:
//   1. The sidebar navigation (guarded by the accessKey permission)
//   2. The Roles permissions matrix (as a grouped card with sub-permissions)
// =============================================================================
type SubPermission = { code: string; label: string; desc: string };
type NavModule = {
  tab: string;             // setActiveTab value
  label: string;           // sidebar display label
  icon: string;            // icon name (matched to ICON_MAP below)
  accessKey: string;       // top-level ACCESS_* permission code
  moduleLabel: string;     // heading in permissions matrix
  moduleDesc: string;      // subtext in permissions matrix
  subPermissions?: SubPermission[]; // granular sub-actions (optional)
};

const NAV_CONFIG: NavModule[] = [
  {
    tab: 'dashboard',
    label: 'Dashboard',
    icon: 'Layers',
    accessKey: 'ACCESS_DASHBOARD',
    moduleLabel: 'Dashboard Overview',
    moduleDesc: 'Access to main statistics, compliance alerts, and checklist metrics',
  },
  {
    tab: 'staff',
    label: 'Staff Control',
    icon: 'Users',
    accessKey: 'ACCESS_STAFF',
    moduleLabel: 'Staff Control Desk',
    moduleDesc: 'Manage staff profiles, employee codes, and NISM validity checks',
  },
  {
    tab: 'clients',
    label: 'Client Management',
    icon: 'ClipboardList',
    accessKey: 'ACCESS_CLIENTS',
    moduleLabel: 'Client Management Module',
    moduleDesc: 'Control access to client profiles and registration details',
    subPermissions: [
      { code: 'VIEW_ALL_CLIENTS', label: 'View All Clients', desc: 'Allows viewing all clients in the portal database' },
      { code: 'VIEW_OWN_CLIENTS', label: 'View Own Clients', desc: 'Allows viewing only clients onboarded by the logged-in staff member' },
      { code: 'CREATE_CLIENTS', label: 'Register Clients', desc: 'Allows registering/adding new clients in the portal' },
      { code: 'EDIT_CLIENTS', label: 'Edit Clients', desc: 'Allows modifying existing client profiles and records' },
      { code: 'DELETE_CLIENTS', label: 'Delete Clients', desc: 'Allows soft-deleting and deactivating client profiles' },
      { code: 'VIEW_SENSITIVE_DATA', label: 'View Sensitive Data (Unmasked)', desc: 'Allows viewing original Email, Mobile, PAN, and Aadhaar without masking' },
      { code: 'EXPORT_DATA', label: 'Export Data (CSV/PDF)', desc: 'Allows exporting client details, staff directories, and compliance reports to CSV' },
    ],
  },
  {
    tab: 'plans',
    label: 'Plan Management',
    icon: 'ClipboardList',
    accessKey: 'ACCESS_PLANS',
    moduleLabel: 'Plan Management Module',
    moduleDesc: 'Control access to subscription plans and categories',
    subPermissions: [
      { code: 'VIEW_ALL_PLANS', label: 'View All Plans', desc: 'Allows viewing all plans in the portal' },
      { code: 'VIEW_OWN_PLANS', label: 'View Own Plans', desc: 'Allows viewing only plans created by the logged-in staff member' },
      { code: 'CREATE_PLANS', label: 'Create Plans', desc: 'Allows creating new plans and categories' },
      { code: 'EDIT_PLANS', label: 'Edit Plans', desc: 'Allows modifying details of existing plans' },
      { code: 'DELETE_PLANS', label: 'Delete Plans', desc: 'Allows deleting or toggling status of plans' },
    ],
  },
  {
    tab: 'research',
    label: 'Signal Management',
    icon: 'TrendingUp',
    accessKey: 'ACCESS_RESEARCH',
    moduleLabel: 'Signal & Research Desk',
    moduleDesc: 'Allows creating and publishing research recommendations',
    subPermissions: [
      { code: 'VIEW_RESEARCH', label: 'View Only', desc: 'Allows viewing all research signals but cannot add or edit' },
      { code: 'ADD_RESEARCH', label: 'Add Research', desc: 'Allows full functionality on signal management' },
      { code: 'OWN_RESEARCH', label: 'Own Research', desc: 'Allows viewing and adding only own research signals' },
    ],
  },
  {
    tab: 'research-reports',
    label: 'Research Reports',
    icon: 'FileText',
    accessKey: 'ACCESS_RESEARCH',
    moduleLabel: 'Research Reports Viewer',
    moduleDesc: 'Allows viewing and downloading of all uploaded research reports',
  },
  {
    tab: 'payments',
    label: 'Payment History',
    icon: 'FileText',
    accessKey: 'ACCESS_PAYMENTS',
    moduleLabel: 'Payment History Desk',
    moduleDesc: 'View all successful client payments and subscriptions',
  },
  {
    tab: 'checklist',
    label: 'SEBI Checklist',
    icon: 'CheckSquare',
    accessKey: 'ACCESS_COMPLIANCE',
    moduleLabel: 'SEBI Checklist',
    moduleDesc: 'View and manage SEBI compliance checklist',
  },
  {
    tab: 'compliance',
    label: 'Compliance Desk',
    icon: 'AlertTriangle',
    accessKey: 'ACCESS_COMPLIANCE',
    moduleLabel: 'Compliance Desk',
    moduleDesc: 'Allows running sweeps, checklist audits, and SCORES complaints',
  },
  {
    tab: 'tickets',
    label: 'Ticket System',
    icon: 'LifeBuoy',
    accessKey: 'ACCESS_TICKETS',
    moduleLabel: 'Support Ticket Desk',
    moduleDesc: 'Manage and resolve customer support tickets and queries',
    subPermissions: [
      { code: 'VIEW_ALL_TICKETS', label: 'View All Tickets', desc: 'Allows viewing and replying to all client tickets' },
      { code: 'VIEW_OWN_TICKETS', label: 'View Own Tickets', desc: 'Allows viewing and replying to tickets only from own onboarding clients' },
    ],
  },
  {
    tab: 'settings',
    label: 'Settings',
    icon: 'Settings',
    accessKey: 'ACCESS_SETTINGS',
    moduleLabel: 'Global Branding & Settings',
    moduleDesc: 'Allows editing company details, invoice calculations, and logos',
  },
  {
    tab: 'customPages',
    label: 'Pages & Policies',
    icon: 'FileText',
    accessKey: 'ACCESS_SETTINGS',
    moduleLabel: 'Pages & Policies Management',
    moduleDesc: 'Manage custom pages, policies, and external links for clients',
  },
  {
    tab: 'complaintReport',
    label: 'Complaint Data',
    icon: 'AlertTriangle',
    accessKey: 'ACCESS_COMPLIANCE',
    moduleLabel: 'Complaint Status Report',
    moduleDesc: 'Manage monthly complaint status statistics',
  },
  {
    tab: 'roles',
    label: 'Roles',
    icon: 'ShieldCheck',
    accessKey: 'ACCESS_ROLES',
    moduleLabel: 'Access Control (Roles)',
    moduleDesc: 'Allows managing permission parameters and custom role templates',
  },
  {
    tab: 'auditLogs',
    label: 'Activity Logs',
    icon: 'Activity',
    accessKey: 'VIEW_AUDIT_LOGS',
    moduleLabel: 'Staff Activity Logs',
    moduleDesc: 'Allows monitoring all actions performed by staff members',
  },

  {
    tab: 'signature_settings',
    label: 'Personal Settings',
    icon: 'Settings',
    accessKey: 'ACCESS_DASHBOARD',
    moduleLabel: 'Personal Settings',
    moduleDesc: 'Configure your signature and UI preferences',
  },
  {
    tab: 'resources',
    label: 'Resources',
    icon: 'FileText',
    accessKey: 'ACCESS_DASHBOARD',
    moduleLabel: 'Resources & Documents',
    moduleDesc: 'Download templates, formats, and other resources',
  },
];

// Map icon string -> Lucide component (keeps NAV_CONFIG serialisable)
const ICON_MAP: Record<string, React.ElementType> = {
  Layers, Users, ClipboardList, TrendingUp, AlertTriangle, FileText, Settings, ShieldCheck, Activity, LifeBuoy, CheckSquare
};

// =============================================================================
// SEGMENT-WISE EXPIRY STACKING ALGORITHM
// For each segment (Cash, Commodity, Future, Option), sorts non-cancelled 
// subscriptions by startDate ascending and stacks durations sequentially.
// If a new plan's startDate is after the current segment's expiry, it starts fresh.
// Otherwise, it extends from the current expiry.
// =============================================================================
function getSegmentKey(segStr: string): string | null {
  const s = segStr.trim().toUpperCase();
  if (s.includes('CASH') || s.includes('EQUITY')) return 'Cash';
  if (s.includes('COMMODITY') || s.includes('MCX')) return 'Commodity';
  if (s.includes('FUTURE') || s.includes('DERIVATIVE')) return 'Future';
  if (s.includes('OPTION')) return 'Option';
  return null;
}

function calculateSegmentExpiries(subscriptions: any[]): { [key: string]: Date | null } {
  const expiries: { [key: string]: Date | null } = {
    'Cash': null,
    'Commodity': null,
    'Future': null,
    'Option': null,
  };

  // Only use non-cancelled subscriptions, sorted by startDate ascending
  const validSubs = (subscriptions || [])
    .filter((s: any) => s.status !== 'CANCELLED')
    .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  validSubs.forEach((sub: any) => {
    if (!sub.plan?.researchSegments || !sub.plan?.durationMonths) return;
    const segs = sub.plan.researchSegments.split(',');
    const durationMs = sub.plan.durationMonths * 30 * 24 * 60 * 60 * 1000;
    const purchaseDate = new Date(sub.startDate);

    segs.forEach((seg: string) => {
      const key = getSegmentKey(seg);
      if (!key) return;

      const currentExpiry = expiries[key];
      if (!currentExpiry || purchaseDate >= currentExpiry) {
        // No overlap — starts fresh from purchase date
        expiries[key] = new Date(purchaseDate.getTime() + durationMs);
      } else {
        // Overlap — stack on top of current expiry
        expiries[key] = new Date(currentExpiry.getTime() + durationMs);
      }
    });
  });

  return expiries;
}

// Dynamically compute display status: if DB says ACTIVE but endDate passed, show EXPIRED
function getDisplayStatus(sub: any): string {
  if (sub.status === 'CANCELLED') return 'CANCELLED';
  if (new Date(sub.endDate) < new Date()) return 'EXPIRED';
  return sub.status; // ACTIVE
}


const downloadCSV = (data: any[], filename: string) => {
  if (!data || !data.length) {
    toast("No data available to export.");
    return;
  }
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return '""';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

import CouponsManager from '../../components/CouponsManager';

function AdminDashboardContent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { appName, logoUrl: appLogo } = useBranding();
  const router = useRouter();

  // Dashboard & Auth states
  const [user, setUser] = useState<any>({ firstName: '', email: '', role: '' });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [completeness, setCompleteness] = useState<number>(0);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardDetails, setWizardDetails] = useState<any>({
    organization: false,
    principalOfficer: false,
    complianceOfficer: false,
    grievance: false,
    internalPolicy: false
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const activeTabRef = useRef<string>('dashboard');
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const [dashboardStats, setDashboardStats] = useState({ staffCount: 0, clientCount: 0, researchCount: 0, planCount: 0 });
  const [settingsTab, setSettingsTab] = useState<'general' | 'integrations' | 'reports' | 'policies' | 'billing' | 'security'>('general');
  const [integrationTab, setIntegrationTab] = useState<'payments' | 'email' | 'kyc'>('payments');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [adminPagesList, setAdminPagesList] = useState<any[]>([]);
  const [isPagesExpanded, setIsPagesExpanded] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const rolesScrollRef = useRef<HTMLDivElement>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleModalLoading, setRoleModalLoading] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editRoleModalLoading, setEditRoleModalLoading] = useState(false);

  const hasPermission = (permCode: string) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true;
    return user?.permissions?.includes(permCode) || false;
  };

  const handleTogglePermission = (permCode: string) => {
    if (!selectedRole || ['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name)) return;

    setSelectedRole((prev: any) => {
      const currentPerms = prev.permissions || [];
      const newPerms = currentPerms.includes(permCode)
        ? currentPerms.filter((p: string) => p !== permCode)
        : [...currentPerms, permCode];
      return { ...prev, permissions: newPerms };
    });
  };

  const [filterActiveClientRange, setFilterActiveClientRange] = useState('daily');
  const [activeClientDownloadStartDate, setActiveClientDownloadStartDate] = useState('');
  const [activeClientDownloadEndDate, setActiveClientDownloadEndDate] = useState('');

  // Bulk Export State
  const [exportRange, setExportRange] = useState<'all' | 'date'>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    triggerConfirm({
      title: 'Update Permissions',
      message: 'Are you sure you want to update permissions for this role?',
      confirmLabel: 'Yes, Update',
      onConfirm: async () => {
        setSavingPermissions(true);
        try {
          const res = await api.updateRolePermissions(selectedRole.id, selectedRole.permissions);
          if (res.success) {
            toast.success('Access permissions updated successfully.');
            await loadData();
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to save permissions.');
        } finally {
          setSavingPermissions(false);
        }
      }
    });
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) {
      toast('Role name is required.');
      return;
    }
    setRoleModalLoading(true);
    try {
      const res = await api.createRole({ name: newRoleName, description: newRoleDesc });
      if (res.success) {
        setIsRoleModalOpen(false);
        setNewRoleName('');
        setNewRoleDesc('');
        toast.success('Role created successfully.');
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role.');
    } finally {
      setRoleModalLoading(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleName) {
      toast('Role name is required.');
      return;
    }
    setEditRoleModalLoading(true);
    try {
      const res = await api.updateRole(editRoleId, { name: editRoleName, description: editRoleDesc });
      if (res.success) {
        setIsEditRoleModalOpen(false);
        setEditRoleName('');
        setEditRoleDesc('');
        setEditRoleId('');
        toast.success('Role updated successfully.');
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role.');
    } finally {
      setEditRoleModalLoading(false);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    triggerConfirm({
      title: 'Delete Custom Role',
      message: 'Are you sure you want to delete this custom role? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await api.deleteRole(roleId);
          if (res.success) {
            toast.success('Role deleted successfully.');
            setSelectedRole(null);
            await loadData();
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete role.');
        }
      }
    });
  };

  // Loading indicator states
  const [loading, setLoading] = useState(true);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportStartYear, setReportStartYear] = useState<number>(new Date().getFullYear());
  const [reportHalf, setReportHalf] = useState<'H1' | 'H2'>('H1');

  useEffect(() => {
    if (showReportModal) {
      api.getPeriodicReportMeta().then(res => {
        if (res.success && res.data?.startYear) {
          setReportStartYear(res.data.startYear);
          // If current selection is older than start year, adjust it
          setReportYear(prev => prev < res.data.startYear ? res.data.startYear : prev);
        }
      });
    }
  }, [showReportModal]);

  // Lists state
  const [staff, setStaff] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [deletedClients, setDeletedClients] = useState<any[]>([]);
  const [clientSubTab, setClientSubTab] = useState<'active' | 'deleted'>('active');
  const [clientSearch, setClientSearch] = useState('');
  const [kraFilter, setKraFilter] = useState('ALL'); // ALL, VERIFIED, FAILED, PENDING
  const [esignFilter, setEsignFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL, SIGNED, PENDING
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE, PENDING_APPROVAL
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');
  const [adminPlans, setAdminPlans] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [planManagementTab, setPlanManagementTab] = useState<'categories' | 'plans'>('categories');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [showDeletedPlans, setShowDeletedPlans] = useState<boolean>(false);
  const [research, setResearch] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [checklistHistory, setChecklistHistory] = useState<any[]>([]);
  const [checklistSubTab, setChecklistSubTab] = useState<'active' | 'history'>('active');
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING'>('ALL');
  const [alertsSubTab, setAlertsSubTab] = useState<'active' | 'history'>('active');
  const [historyFilterText, setHistoryFilterText] = useState('');
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>('All');
  const [penalties, setPenalties] = useState<any[]>([]);
  const [complianceTab, setComplianceTab] = useState<'overview' | 'alerts' | 'checklist' | 'penalties' | 'complaints' | 'audit_history'>('overview');
  const [alertViewMode, setAlertViewMode] = useState<'card' | 'table'>('card');

  useEffect(() => {
    const overdueHandler = () => {
      setActiveTab('compliance');
      setComplianceTab('checklist');
      setChecklistSubTab('active');
      setChecklistStatusFilter('OVERDUE');
    };
    const upcomingHandler = () => {
      setActiveTab('compliance');
      setComplianceTab('checklist');
      setChecklistSubTab('active');
      setChecklistStatusFilter('ALL');
    };
    window.addEventListener('nav-to-overdue', overdueHandler);
    window.addEventListener('nav-to-upcoming', upcomingHandler);
    return () => {
      window.removeEventListener('nav-to-overdue', overdueHandler);
      window.removeEventListener('nav-to-upcoming', upcomingHandler);
    };
  }, []);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [auditModalReq, setAuditModalReq] = useState<any>(null);
  const [auditStatus, setAuditStatus] = useState('');
  const [auditRemarks, setAuditRemarks] = useState('');
  const [auditPenaltyAmt, setAuditPenaltyAmt] = useState('');
  const [auditProof, setAuditProof] = useState<File | null>(null);
  const [penaltyResolveId, setPenaltyResolveId] = useState<string | null>(null);
  const [penaltyResolutionType, setPenaltyResolutionType] = useState('');
  const [penaltyPayRef, setPenaltyPayRef] = useState('');
  const [penaltyProof, setPenaltyProof] = useState<File | null>(null);
  const [penaltyRemarks, setPenaltyRemarks] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  // Complaint resolve state
  const [complaintResolveId, setComplaintResolveId] = useState<string | null>(null);
  const [complaintAtrProof, setComplaintAtrProof] = useState<File | null>(null);
  const [complaintAtrRemarks, setComplaintAtrRemarks] = useState('');
  const [complaintResolveLoading, setComplaintResolveLoading] = useState(false);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [dashboardMetric, setDashboardMetric] = useState<'sales' | 'clients'>('sales');
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'monthly' | 'yearly'>('monthly');

  // Support Tickets Admin State
  const [adminTickets, setAdminTickets] = useState<any[]>([]);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState<any>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminReplyAttachment, setAdminReplyAttachment] = useState<File | null>(null);
  const [adminTicketStatusFilter, setAdminTicketStatusFilter] = useState<'ALL' | 'PENDING' | 'OPEN' | 'CLOSED'>('ALL');

  // Plan modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSegments, setCatSegments] = useState<string[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planCategoryId, setPlanCategoryId] = useState('');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDuration, setPlanDuration] = useState('1');
  const [planSegments, setPlanSegments] = useState<string[]>(['EQUITY']);
  const [planNotifs, setPlanNotifs] = useState<string[]>(['EMAIL', 'INAPP']);
  const [planClientLimit, setPlanClientLimit] = useState('100');

  // Add Client modal state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientDuplicateField, setClientDuplicateField] = useState<string | null>(null);
  const [clientDuplicateError, setClientDuplicateError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [clientPan, setClientPan] = useState('');
  const [clientAadhaar, setClientAadhaar] = useState('');
  const [clientCategory, setClientCategory] = useState('INDIVIDUAL');
  const [clientOccupation, setClientOccupation] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientZip, setClientZip] = useState('');
  const [clientModalLoading, setClientModalLoading] = useState(false);

  // View/Edit Client modal states
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isViewClientModalOpen, setIsViewClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  // Assign Plan by Admin modal state
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
  const [assignPlanClient, setAssignPlanClient] = useState<any>(null);
  const [assignPlanCategoryId, setAssignPlanCategoryId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignPlanRemarks, setAssignPlanRemarks] = useState('');
  const [assignPaymentRefId, setAssignPaymentRefId] = useState('');
  const [assignPaymentDate, setAssignPaymentDate] = useState('');
  const [assignPlanLoading, setAssignPlanLoading] = useState(false);
  const [assignCustomAmount, setAssignCustomAmount] = useState<string>('');
  const [assignCustomDays, setAssignCustomDays] = useState<string>('');
  const [assignCouponCode, setAssignCouponCode] = useState('');
  const [coupons, setCoupons] = useState<any[]>([]);

  const getPlanAmountWithCoupon = (basePrice: number, durationMonths: number, couponCode: string) => {
    let finalBase = basePrice;
    if (couponCode) {
      const coupon = coupons.find((c: any) => c.code === couponCode && c.status === 'ACTIVE');
      if (coupon) {
        let disc = 0;
        if (coupon.discountType === 'FLAT') {
          disc = coupon.discountValue;
        } else if (coupon.discountType === 'PERCENTAGE') {
          disc = (basePrice * coupon.discountValue) / 100;
          if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && disc > coupon.maxDiscountValue) {
            disc = coupon.maxDiscountValue;
          }
        }
        if (disc > basePrice) disc = basePrice;
        finalBase = basePrice - disc;
      }
    }
    return gstCalculationType === 'EXCLUSIVE' ? Math.round(finalBase * 1.18) : finalBase;
  };

  // Reusable confirmation state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => { },
  });

  const triggerConfirm = (options: {
    title: string;
    message: string | React.ReactNode;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => {
    setConfirmState({
      isOpen: true,
      title: options.title,
      message: options.message,
      variant: options.variant || 'warning',
      onConfirm: () => {
        options.onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
    });
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPlanId) { toast('Please select a plan.'); return; }
    if (!assignPaymentRefId.trim()) { toast('Please enter Payment Ref ID.'); return; }
    if (!assignPaymentDate) { toast('Please select Payment Date.'); return; }

    const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
    if (!selectedPlan) return;

    let basePrice = selectedPlan.price;
    let finalPrice = gstCalculationType === 'EXCLUSIVE' ? Math.round(basePrice * 1.18) : basePrice;

    if (assignCustomAmount.trim()) {
      finalPrice = Number(assignCustomAmount);
      if (gstCalculationType === 'EXCLUSIVE') {
        basePrice = Math.round(finalPrice / 1.18);
      } else {
        basePrice = finalPrice;
      }
    }

    const gstAmount = finalPrice - basePrice;

    const messageNode = (
      <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <p>
          Are you sure you want to assign the plan <strong>"{selectedPlan.name}"</strong> to client <strong>"{assignPlanClient?.name || ''}"</strong>?
        </p>
        <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between"><span>Base Amount:</span> <span className="text-slate-800 dark:text-slate-200">₹{basePrice.toLocaleString()}</span></div>
          {gstCalculationType === 'EXCLUSIVE' ? (
            <>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>GST (18%):</span> <span className="text-slate-700 dark:text-slate-300">₹{gstAmount.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-slate-400 dark:border-white/10 pt-1.5 font-extrabold text-violet-400"><span>Total Amount:</span> <span>₹{finalPrice.toLocaleString()}</span></div>
            </>
          ) : (
            <div className="flex justify-between border-t border-slate-400 dark:border-white/10 pt-1.5 font-extrabold text-violet-400"><span>Total (GST Incl.):</span> <span>₹{finalPrice.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-400 dark:border-white/10 pt-1.5"><span>Payment Ref:</span> <span className="text-slate-700 dark:text-slate-300">{assignPaymentRefId}</span></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Payment Date:</span> <span className="text-slate-700 dark:text-slate-300">{assignPaymentDate}</span></div>
          {assignCustomDays.trim() && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-400 dark:border-white/10 pt-1.5"><span>Service Validity:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{assignCustomDays} Days</span></div>
          )}
        </div>
        <p className="text-slate-500 dark:text-slate-500 text-[10px]">This will immediately activate the plan. Any existing active subscription will be cancelled.</p>
      </div>
    );

    triggerConfirm({
      title: 'Confirm Plan Assignment',
      message: messageNode,
      confirmLabel: 'Yes, Assign Plan',
      onConfirm: async () => {
        setAssignPlanLoading(true);
        try {
          const payload: any = {
            planId: assignPlanId,
            remarks: assignPlanRemarks,
            paymentRefId: assignPaymentRefId,
            paymentDate: assignPaymentDate
          };
          if (assignCustomAmount.trim()) payload.customAmount = Number(assignCustomAmount);
          if (assignCustomDays.trim()) payload.customDays = Number(assignCustomDays);
          if (assignCouponCode.trim()) payload.couponCode = assignCouponCode;

          const res = await api.assignPlanByAdmin(assignPlanClient.id, payload);
          if (res.success) {
            setIsAssignPlanModalOpen(false);
            setAssignPlanClient(null);
            setAssignPlanCategoryId('');
            setAssignPlanId('');
            setAssignPlanRemarks('');
            setAssignPaymentRefId('');
            setAssignPaymentDate('');
            setAssignCustomAmount('');
            setAssignCustomDays('');
            setAssignCouponCode('');
            await loadData();
            toast('✅ ' + res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to assign plan.');
        } finally {
          setAssignPlanLoading(false);
        }
      }
    });
  };

  const [editClientName, setEditClientName] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientMobile, setEditClientMobile] = useState('');
  const [editClientPan, setEditClientPan] = useState('');
  const [editClientAadhaar, setEditClientAadhaar] = useState('');
  const [editClientCategory, setEditClientCategory] = useState('INDIVIDUAL');
  const [editClientOccupation, setEditClientOccupation] = useState('');
  const [editClientAddress, setEditClientAddress] = useState('');
  const [editClientCity, setEditClientCity] = useState('');
  const [editClientState, setEditClientState] = useState('');
  const [editClientZip, setEditClientZip] = useState('');
  const [editClientModalLoading, setEditClientModalLoading] = useState(false);
  const [clientDetailsTab, setClientDetailsTab] = useState<'profile' | 'kyc' | 'subscriptions' | 'communications'>('profile');
  const [clientCommunications, setClientCommunications] = useState<any[]>([]);

  const { states } = useStates();
  const { cities: clientCities } = useCities(clientState);
  const { cities: editClientCities } = useCities(editClientState);

  // Wizard input state
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [orgAddress, setOrgAddress] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgMobile, setOrgMobile] = useState('');
  const [orgGst, setOrgGst] = useState('');

  const [poName, setPoName] = useState('');
  const [poEmail, setPoEmail] = useState('');
  const [poMobile, setPoMobile] = useState('');
  const [poNism, setPoNism] = useState('');
  const [poValidity, setPoValidity] = useState('');

  const [coName, setCoName] = useState('');
  const [coEmail, setCoEmail] = useState('');
  const [coMobile, setCoMobile] = useState('');
  const [coNism, setCoNism] = useState('');

  const [policyUrl, setPolicyUrl] = useState('');
  const [gstCalculationType, setGstCalculationType] = useState('EXCLUSIVE');
  const [tenantState, setTenantState] = useState('');
  const [kycFirst, setKycFirst] = useState(true);
  const [welcomeEmailText, setWelcomeEmailText] = useState('');
  const [reportDisclaimer, setReportDisclaimer] = useState('');
  const [termsPdf, setTermsPdf] = useState(null);
  const [internalPolicyPdf, setInternalPolicyPdf] = useState(null);
  const [logoFile, setLogoFile] = useState<any>(null);
  const [privacyPdf, setPrivacyPdf] = useState(null);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');


  // Periodic Report Settings
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountType, setBankAccountType] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [socialMediaLinks, setSocialMediaLinks] = useState<{ platform: string, link: string }[]>([{ platform: '', link: '' }]);

  // Digio Settings & Agreement
  const [digioClientId, setDigioClientId] = useState('');
  const [digioClientSecret, setDigioClientSecret] = useState('');
  const [digioKycTemplateName, setDigioKycTemplateName] = useState('');
  // Payment Gateway states
  const [activePaymentGateway, setActivePaymentGateway] = useState('RAZORPAY');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [cashfreeAppId, setCashfreeAppId] = useState('');
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState('');
  const [ccavenueMerchantId, setCcavenueMerchantId] = useState('');
  const [ccavenueAccessCode, setCcavenueAccessCode] = useState('');
  const [ccavenueWorkingKey, setCcavenueWorkingKey] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');

  const [agreementContent, setAgreementContent] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  // Staff creation form state
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffRole, setStaffRole] = useState('RESEARCHER');
  const [associatedType, setAssociatedType] = useState('SALES');
  const [customAssociatedRole, setCustomAssociatedRole] = useState('');
  const [staffNism, setStaffNism] = useState('');
  const [staffNismValidity, setStaffNismValidity] = useState('');
  const [createdStaffCreds, setCreatedStaffCreds] = useState<any>(null);
  const [showStaffCredsPopup, setShowStaffCredsPopup] = useState(false);

  // Staff popup and editing states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffNismFile, setStaffNismFile] = useState<File | null>(null);
  const [isParsingStaffNism, setIsParsingStaffNism] = useState(false);
  const [staffNismParsed, setStaffNismParsed] = useState<{ nismRegistration?: string; name?: string; nismValidity?: string } | null>(null);
  const [nismParseMsg, setNismParseMsg] = useState<string>('');

  // Complaint modal states
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintClientName, setComplaintClientName] = useState('');
  const [complaintEmail, setComplaintEmail] = useState('');
  const [complaintMobile, setComplaintMobile] = useState('');
  const [complaintPan, setComplaintPan] = useState('');
  const [complaintSource, setComplaintSource] = useState('MANUAL');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintReceivedAt, setComplaintReceivedAt] = useState('');
  const [complaintSearchQuery, setComplaintSearchQuery] = useState('');
  const [complaintFoundClient, setComplaintFoundClient] = useState<any | null>(null);
  const [showClientNotFoundAlert, setShowClientNotFoundAlert] = useState(false);
  const [isManualFillAllowed, setIsManualFillAllowed] = useState(false);

  const handleSearchClientForComplaint = (queryStr?: string) => {
    const q = (queryStr !== undefined ? queryStr : complaintSearchQuery).trim().toLowerCase();
    if (!q) return;

    const cleanQ = q.replace(/\s+/g, '');
    const matched = clients.find((cl: any) => {
      const nameStr = `${cl.name || ''} ${cl.user?.firstName || ''} ${cl.user?.lastName || ''}`.toLowerCase();
      const emailStr = (cl.email || cl.user?.email || '').toLowerCase();
      const mobileStr = (cl.mobile || '').replace(/\D/g, '');
      const panStr = (cl.pan || '').toLowerCase();
      const aadhaarStr = (cl.aadhaar || cl.profile?.aadhaar || '').replace(/\D/g, '');

      return (
        nameStr.includes(q) ||
        (emailStr && emailStr === q) ||
        (mobileStr && mobileStr === cleanQ) ||
        (panStr && panStr === cleanQ) ||
        (aadhaarStr && cleanQ.length >= 4 && aadhaarStr.includes(cleanQ))
      );
    });

    if (matched) {
      setComplaintFoundClient(matched);
      setShowClientNotFoundAlert(false);
      setIsManualFillAllowed(true);
      const fullName = (matched.name || `${matched.user?.firstName || ''} ${matched.user?.lastName || ''}`).trim();
      setComplaintClientName(fullName);
      setComplaintEmail(matched.email || matched.user?.email || '');
      setComplaintMobile(matched.mobile || '');
      setComplaintPan(matched.pan || '');
    } else {
      setComplaintFoundClient(null);
      setShowClientNotFoundAlert(true);
      setIsManualFillAllowed(false);
    }
  };
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  // Research creation state
  const [resTitle, setResTitle] = useState('');
  const [resSummary, setResSummary] = useState('');
  const [resDetails, setResDetails] = useState('');
  const [resSegment, setResSegment] = useState('EQUITY');
  const [resType, setResType] = useState('BUY');
  const [resRecommendation, setResRecommendation] = useState('BUY');
  const [resTarget, setResTarget] = useState('');

  // Publish checklist state
  const [checklistReportId, setChecklistReportId] = useState<string | null>(null);
  const [chkTnc, setChkTnc] = useState(false);
  const [chkPolicy, setChkPolicy] = useState(false);
  const [chkConsent, setChkConsent] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Close compliance alert state
  const [closingAlertId, setClosingAlertId] = useState<string | null>(null);
  const [alertProof, setAlertProof] = useState<File | null>(null);
  const [depositTopup, setDepositTopup] = useState('50000');
  const [closeRemarks, setCloseRemarks] = useState('');

  const isNismDuplicate = staffNism.trim() !== '' && staff.some(st =>
    st.nismNumber &&
    st.nismNumber.trim().toLowerCase() === staffNism.trim().toLowerCase() &&
    (!editingStaff || st.id !== editingStaff.id)
  );

  const isStaff = user && user.role && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN';

  const getFullUrl = (url?: string | null) => {
    if (!url) return 'N/A';
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() + ''}${url}`;
  };

  const handleDownloadCSV = (type: string) => {
    let dataToExport: any[] = [];
    let filename = `${type}.csv`;

    if (type === 'checklist' || type === 'audit_history') {
      let srcList = checklistSubTab === 'active' ? checklist : checklistHistory;
      filename = checklistSubTab === 'active' ? 'Active_Checklist.csv' : 'Checklist_History.csv';
      dataToExport = srcList.map((item: any) => ({
        'Requirement': item.requirement?.description || 'N/A',
        'Frequency': item.requirement?.frequencyType || 'N/A',
        'Status': item.audit?.status || 'PENDING',
        'Due/Updated Date': item.audit?.updatedAt ? new Date(item.audit.updatedAt).toLocaleDateString() : 'N/A',
        'Remarks': item.audit?.officerRemarks || 'N/A',
        'Proof URL': getFullUrl(item.audit?.proofDocumentUrl)
      }));
    } else if (type === 'alerts') {
      let srcList = alertsSubTab === 'active' ? alerts.filter((a: any) => a.status === 'OPEN') : alerts.filter((a: any) => a.status === 'CLOSED');
      filename = alertsSubTab === 'active' ? 'Active_Alerts.csv' : 'Resolved_Alerts_History.csv';
      dataToExport = srcList.map((a: any) => {
        let cleanRemarks = (a.remarks || '').replace(/Associated with Audit ID:\s*[a-f0-9\-]+/i, '').trim();
        return {
          'Alert Type': a.alertType || 'N/A',
          'Status': a.status || 'N/A',
          'Date Logged': a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A',
          'Description / Message': a.description || 'N/A',
          'Resolution Remarks': cleanRemarks || 'N/A'
        };
      });
    } else if (type === 'penalties') {
      filename = 'Penalties.csv';
      dataToExport = penalties.map((p: any) => ({
        'Requirement': p.audit?.requirement?.requirement || 'N/A',
        'Reason': p.reason || 'N/A',
        'Suggested Penalty': p.amount || 'N/A',
        'Date Logged': (p.audit?.dueDate || p.audit?.createdAt) ? new Date(p.audit.dueDate || p.audit.createdAt).toLocaleDateString() : 'N/A',
        'Status': p.status === 'PENDING_PAYMENT' ? 'NON-COMPLIANT' : p.status === 'PAID' ? 'COMPLIANT' : p.status,
        'Resolved Date': p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A',
        'Remarks': p.remarks || 'N/A',
        'Proof URL': getFullUrl(p.proofUrl)
      }));
    } else if (type === 'complaints') {
      filename = 'Complaints.csv';
      dataToExport = complaints.map((c: any) => ({
        'SCORES ID': c.scoresRegNo || 'N/A',
        'Complainant': c.complainantName || 'N/A',
        'Date Received': c.dateReceived ? new Date(c.dateReceived).toLocaleDateString() : 'N/A',
        'Status': c.status || 'N/A',
        'Description': c.description || 'N/A',
        'ATR Remarks': c.atrRemarks || 'N/A',
        'ATR Proof': getFullUrl(c.atrProofUrl)
      }));
    } else if (type === 'overview') {
      toast("No tabular data on overview to export.");
      return;
    }

    if (dataToExport.length === 0) {
      toast("No data available to export.");
      return;
    }
    downloadCSV(dataToExport, filename);
  };

  const loadData = async (initStep = false) => {
    try {
      const tab = activeTabRef.current;

      if (initStep) {
        try {
          const comp = await api.getProfileCompleteness();
          if (comp.success) {
            setCompleteness(comp.data.score);
            setWizardDetails(comp.data.details);

            const t = comp.data.data;
            if (t) {
              if (t.address) setOrgAddress(t.address);
              if (t.website) setOrgWebsite(t.website);
              if (t.mobile) setOrgMobile(t.mobile);
              if (t.gst) setOrgGst(t.gst);
              if (t.internalPolicyUrl) setPolicyUrl(t.internalPolicyUrl);
              if (t.gstCalculationType) setGstCalculationType(t.gstCalculationType);
              if (t.state) setTenantState(t.state);
              if (t.smtpHost) setSmtpHost(t.smtpHost);
              if (t.smtpPort) setSmtpPort(t.smtpPort.toString());
              if (t.smtpUser) setSmtpUser(t.smtpUser);
              if (t.smtpPassword) setSmtpPassword(t.smtpPassword);
              if (t.smtpFrom) setSmtpFrom(t.smtpFrom);
              if (t.bankAccountName) setBankAccountName(t.bankAccountName);
              if (t.bankAccountNo) setBankAccountNo(t.bankAccountNo);
              if (t.bankAccountType) setBankAccountType(t.bankAccountType);
              if (t.bankIfsc) setBankIfsc(t.bankIfsc);
              if (t.bankName) setBankName(t.bankName);
              if (t.bankBranch) setBankBranch(t.bankBranch);
              if (t.socialMediaLinks) {
                try { setSocialMediaLinks(JSON.parse(t.socialMediaLinks)); } catch (e) { }
              }
              if (t.digioClientId) setDigioClientId(t.digioClientId);
              if (t.digioClientSecret) setDigioClientSecret(t.digioClientSecret);
              if (t.digioKycTemplateName) setDigioKycTemplateName(t.digioKycTemplateName);
              if (t.activePaymentGateway) setActivePaymentGateway(t.activePaymentGateway);
              if (t.razorpayKeyId) setRazorpayKeyId(t.razorpayKeyId);
              if (t.razorpayKeySecret) setRazorpayKeySecret(t.razorpayKeySecret);
              if (t.cashfreeAppId) setCashfreeAppId(t.cashfreeAppId);
              if (t.cashfreeSecretKey) setCashfreeSecretKey(t.cashfreeSecretKey);
              if (t.ccavenueMerchantId) setCcavenueMerchantId(t.ccavenueMerchantId);
              if (t.ccavenueAccessCode) setCcavenueAccessCode(t.ccavenueAccessCode);
              if (t.ccavenueWorkingKey) setCcavenueWorkingKey(t.ccavenueWorkingKey);
              if (t.stripePublishableKey) setStripePublishableKey(t.stripePublishableKey);
              if (t.stripeSecretKey) setStripeSecretKey(t.stripeSecretKey);

              if (t.agreementContent) setAgreementContent(t.agreementContent);
              if (t.welcomeEmailText) setWelcomeEmailText(t.welcomeEmailText);
              if (t.reportDisclaimer) setReportDisclaimer(t.reportDisclaimer);

              const po = t.users?.find((u: any) => u.role?.name === 'PRINCIPAL_OFFICER');
              if (po) {
                setPoName((po.firstName || '') + ' ' + (po.lastName || ''));
                setPoEmail(po.email || '');
                setPoMobile(po.mobile || '');
                if (po.staff?.nismNumber) setPoNism(po.staff.nismNumber);
                if (po.staff?.nismValidity) setPoValidity(new Date(po.staff.nismValidity).toISOString().split('T')[0]);
              }
              const co = t.users?.find((u: any) => u.role?.name === 'COMPLIANCE_OFFICER');
              if (co) {
                setCoName((co.firstName || '') + ' ' + (co.lastName || ''));
                setCoEmail(co.email || '');
                setCoMobile(co.mobile || '');
                if (co.staff?.nismNumber) setCoNism(co.staff.nismNumber);
              }
            }

            if (initStep && comp.data.score < 80) {
              const d = comp.data.details;
              if (!d.organization) setWizardStep(1);
              else if (!d.principalOfficer) setWizardStep(2);
              else if (!d.complianceOfficer) setWizardStep(3);
              else if (!d.grievance) setWizardStep(4);
              else if (!d.internalPolicy) setWizardStep(5);
              else setWizardStep(1);
            }
          }
        } catch (err: any) { console.error('Failed to load profile completeness:', err); }

        try {
          const rolesReq = await api.getRoles();
          if (rolesReq.success) {
            setRoles(rolesReq.data);
            setSelectedRole((prev: any) => {
              if (prev) return prev;
              const adminRole = rolesReq.data.find((r: any) => r.name === 'ADMIN');
              return adminRole || rolesReq.data[0] || null;
            });
          }
        } catch (e: any) { }
      }

      // Tab specific data loading
      if (tab === 'dashboard') {
        api.request('/admin/dashboard-stats').then(res => {
          if (res.success) setDashboardStats(res.data);
        }).catch(() => { });
        api.getTenantAuditLogs().then(res => {
          if (res.success) setActivityLogs(res.data);
        }).catch(() => { });
        api.listAdminTickets().then(res => {
          if (res.success) setAdminTickets(res.data);
        }).catch(() => { });
      }

      if (tab === 'staff' || tab === 'roles') {
        api.getStaff().then(res => { if (res.success) setStaff(res.data); }).catch(() => { });
      }

      if (tab === 'clients') {
        api.getAdminClients().then(res => { if (res.success) setClients(res.data); }).catch(() => { });
        api.getAdminDeletedClients().then(res => { if (res.success) setDeletedClients(res.data); }).catch(() => { });
        api.getAdminCategories().then(res => { if (res.success) setCategories(res.data); }).catch(() => { });
        api.getAdminPlans().then(res => { if (res.success) setAdminPlans(res.data); }).catch(() => { });
      }

      if (tab === 'research') {
        api.listResearch().then(res => { if (res.success) setResearch(res.data); }).catch(() => { });
        api.getAdminCategories().then(res => { if (res.success) setCategories(res.data); }).catch(() => { });
        api.getAdminPlans().then(res => { if (res.success) setAdminPlans(res.data); }).catch(() => { });
      }

      if (tab === 'plans') {
        api.getAdminPlans().then(res => { if (res.success) setAdminPlans(res.data); }).catch(() => { });
        api.getAdminCategories().then(res => { if (res.success) setCategories(res.data); }).catch(() => { });
      }

      if (tab === 'compliance' || tab === 'checklist') {
        api.request('/compliance/complaints').then(res => { if (Array.isArray(res)) setComplaints(res); }).catch(() => { });
        api.getComplianceAlerts().then(res => { if (res.success && res.data.length > 0) setAlerts(res.data); }).catch(() => { });
        api.getComplianceChecklist().then(res => { if (res.success) setChecklist(res.data); }).catch(() => { });
        api.getPenalties().then(res => { if (res.success) setPenalties(res.data); }).catch(() => { });
        api.getComplianceChecklistHistory().then(res => { if (res.success) setChecklistHistory(res.data); }).catch(() => { });
      }

      if (tab === 'payments') {
        api.getAdminPayments().then(res => { if (res.success) setAllPayments(res.data); }).catch(() => { });
      }

    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (initStep) setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadData(false);
    }
  }, [activeTab]);

  const salesAndClientChartData = useMemo(() => {
    const formatPeriod = (dateStr: string, timeframe: 'monthly' | 'yearly') => {
      const d = new Date(dateStr);
      if (timeframe === 'yearly') {
        return d.getFullYear().toString();
      } else {
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    };

    const timeframe = dashboardTimeframe;
    const metric = dashboardMetric;



    const dataMap = new Map<string, number>();

    if (metric === 'sales') {
      allPayments.forEach((p: any) => {
        if (p.status === 'SUCCESS' || p.paymentMode === 'ADMIN_ASSIGNED') {
          const key = formatPeriod(p.createdAt, timeframe);
          dataMap.set(key, (dataMap.get(key) || 0) + p.amount);
        }
      });
    } else {
      clients.forEach((c: any) => {
        const key = formatPeriod(c.user?.createdAt || c.createdAt || new Date(), timeframe);
        dataMap.set(key, (dataMap.get(key) || 0) + 1);
      });
    }

    const sortedKeys = Array.from(dataMap.keys()).sort((a, b) => {
      return new Date('01 ' + a).getTime() - new Date('01 ' + b).getTime();
    });

    return sortedKeys.map(key => ({
      period: key,
      value: dataMap.get(key) || 0
    }));
  }, [allPayments, clients, dashboardTimeframe, dashboardMetric]);
  // Paginators
  const getFinancialYear = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = d.getMonth();
    if (month >= 3) {
      return `FY ${year}-${(year + 1).toString().slice(-2)}`;
    } else {
      return `FY ${year - 1}-${year.toString().slice(-2)}`;
    }
  };

  const availableFinancialYears = useMemo(() => {
    const years = new Set<string>();
    checklistHistory.forEach((h: any) => years.add(getFinancialYear(h.createdAt)));
    alerts.forEach((a: any) => years.add(getFinancialYear(a.createdAt)));
    complaints.forEach((c: any) => years.add(getFinancialYear(c.receivedAt)));
    penalties.forEach((p: any) => years.add(getFinancialYear(p.createdAt || p.audit?.createdAt)));
    return Array.from(years).filter(y => y !== 'Unknown').sort().reverse();
  }, [checklistHistory, alerts, complaints, penalties]);

  const topLevelFilteredHistory = useMemo(() => {
    return checklistHistory.filter((h: any) => {
      const matchesText = h.requirement?.requirement?.toLowerCase().includes(historyFilterText.toLowerCase());
      const matchesFY = selectedFinancialYear === 'All' || getFinancialYear(h.createdAt) === selectedFinancialYear;
      return matchesText && matchesFY;
    });
  }, [checklistHistory, historyFilterText, selectedFinancialYear]);

  const historyPagination = usePagination(topLevelFilteredHistory, 10);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/admin/login');
        return;
      }
      const u = JSON.parse(userStr);
      setUser(u);

      if (u?.role === 'COMPLIANCE_OFFICER') setActiveTab('compliance'); else if (u?.role === 'RESEARCHER' || u?.role === 'PRINCIPAL_OFFICER') setActiveTab('research');

      api.getCurrentUser().then(res => {
        if (res.success) {
          const syncedUser = res.data.user;
          if (u?.isImpersonated) {
            syncedUser.isImpersonated = true;
          }
          setUser(syncedUser);
          localStorage.setItem('user', JSON.stringify(syncedUser));

          const isAllowed = (tab: string) => {
            if (syncedUser.role === 'SUPER_ADMIN' || syncedUser.role === 'ADMIN') return true;
            const permMap: Record<string, string> = {
              dashboard: 'ACCESS_DASHBOARD',
              staff: 'ACCESS_STAFF',
              clients: 'ACCESS_CLIENTS',
              plans: 'ACCESS_PLANS',
              research: 'ACCESS_RESEARCH',
              payments: 'ACCESS_PAYMENTS',
              compliance: 'ACCESS_COMPLIANCE',
              settings: 'ACCESS_SETTINGS',
              roles: 'ACCESS_ROLES',
              tickets: 'ACCESS_TICKETS'
            };
            const perm = permMap[tab];
            if (!perm) return true;
            return syncedUser.permissions?.includes(perm) || false;
          };

          const tabs = ['dashboard', 'staff', 'clients', 'plans', 'research', 'payments', 'compliance', 'settings', 'signature_settings', 'roles', 'tickets', 'resources'];
          const currentTab = activeTab;
          if (!isAllowed(currentTab)) {
            for (const t of tabs) {
              if (isAllowed(t)) {
                setActiveTab(t as any);
                break;
              }
            }
          }
        }
      }).catch(err => console.error('Failed to sync user details:', err));
    }
    loadData(true);
  }, []);

  useEffect(() => {
    if (user) {
      if (hasPermission('ACCESS_SETTINGS')) {
        api.request('/admin/pages').then(res => {
          if (res.success) setAdminPagesList(res.data);
        }).catch(() => { });
      } else {
        // Fetch active pages for non-admin to view in Legal tab
        api.request('/pages').then(res => {
          if (res.success) setAdminPagesList(res.data);
        }).catch(() => { });
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.role) {
      const isAllowed = (tab: string) => {
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
        const permMap: Record<string, string> = {
          dashboard: 'ACCESS_DASHBOARD',
          staff: 'ACCESS_STAFF',
          clients: 'ACCESS_CLIENTS',
          plans: 'ACCESS_PLANS',
          research: 'ACCESS_RESEARCH',
          payments: 'ACCESS_PAYMENTS',
          compliance: 'ACCESS_COMPLIANCE',
          settings: 'ACCESS_SETTINGS',
          roles: 'ACCESS_ROLES',
          tickets: 'ACCESS_TICKETS'
        };
        const perm = permMap[tab];
        if (!perm) return true;
        return user.permissions?.includes(perm) || false;
      };

      let desiredTab = '';
      const hashTab = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
      if (hashTab && isAllowed(hashTab)) {
        desiredTab = hashTab;
      } else {
        desiredTab = user.role === 'COMPLIANCE_OFFICER' ? 'compliance' : (['RESEARCHER', 'PRINCIPAL_OFFICER'].includes(user.role) ? 'research' : 'dashboard');
      }

      if (isAllowed(desiredTab)) {
        setActiveTab(desiredTab as any);
      } else {
        const tabs = ['dashboard', 'staff', 'clients', 'plans', 'research', 'payments', 'compliance', 'settings', 'signature_settings', 'roles', 'tickets', 'resources'];
        for (const t of tabs) {
          if (isAllowed(t)) {
            setActiveTab(t as any);
            break;
          }
        }
      }
    }
  }, [user.role, user.permissions]);

  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (typeof window !== 'undefined' && activeTab) {
      if (window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    }
  }, [activeTab]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || catSegments.length === 0) {
      toast('Name and at least one segment are required.');
      return;
    }
    try {
      const res = await api.createCategory({ name: catName, segments: catSegments.join(',') });
      if (res.success) {
        setIsCategoryModalOpen(false);
        setCatName('');
        setCatSegments([]);
        loadData();
      }
    } catch (err: any) { toast(err.message); }
  };

  const handleToggleCategoryStatus = (id: string) => {
    const category = categories.find(c => c.id === id);
    const actionName = category?.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
    triggerConfirm({
      title: actionName + ' Category',
      message: 'Are you sure you want to ' + actionName.toLowerCase() + ' the category "' + (category?.name || '') + '"?',
      variant: 'warning',
      confirmLabel: 'Yes, ' + actionName,
      onConfirm: async () => {
        try {
          const res = await api.toggleCategoryStatus(id);
          if (res.success) loadData();
        } catch (err: any) { toast(err.message); }
      }
    });
  };

  const handleTogglePlanStatus = (id: string) => {
    const plan = adminPlans.find(p => p.id === id);
    const actionName = plan?.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
    triggerConfirm({
      title: actionName + ' Plan',
      message: 'Are you sure you want to ' + actionName.toLowerCase() + ' the plan "' + (plan?.name || '') + '"?',
      variant: 'warning',
      confirmLabel: 'Yes, ' + actionName,
      onConfirm: async () => {
        try {
          const res = await api.togglePlanStatus(id);
          if (res.success) loadData();
        } catch (err: any) { toast(err.message); }
      }
    });
  };

  const handleDeletePlan = (id: string) => {
    const plan = adminPlans.find(p => p.id === id);
    triggerConfirm({
      title: 'Delete Plan',
      message: 'Are you sure you want to delete the plan "' + (plan?.name || '') + '"?',
      variant: 'danger',
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await api.deletePlan(id);
          if (res.success) {
            loadData();
            toast.success('Plan soft-deleted successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete plan.');
        }
      }
    });
  };

  const handleRestorePlan = (id: string) => {
    const plan = adminPlans.find(p => p.id === id);
    triggerConfirm({
      title: 'Restore Plan',
      message: 'Are you sure you want to restore the plan "' + (plan?.name || '') + '"?',
      variant: 'success',
      confirmLabel: 'Yes, Restore',
      onConfirm: async () => {
        try {
          const res = await api.restorePlan(id);
          if (res.success) {
            loadData();
            toast.success('Plan restored successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to restore plan.');
        }
      }
    });
  };

  const [uploadingCoSignature, setUploadingCoSignature] = useState<boolean>(false);

  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);
  useEffect(() => {
    if (selectedClient && selectedClient.id) {
      api.getClientCommunicationsAdmin(selectedClient.id)
        .then(res => setClientCommunications(res.data || []))
        .catch(() => setClientCommunications([]));
    } else {
      setClientCommunications([]);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showMobilePreview');
      if (saved !== null) setShowMobilePreview(saved !== 'false');
    }
  }, []);

  const toggleMobilePreview = () => {
    const newVal = !showMobilePreview;
    setShowMobilePreview(newVal);
    localStorage.setItem('showMobilePreview', newVal.toString());
  };

  const handleUploadCoSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingCoSignature(true);
    try {
      const formData = new FormData();
      formData.append('coSignature', file);
      const data = await api.request('/admin/signature', {
        method: 'PUT',
        body: formData
      });
      if (data.success) {
        toast.success('Signature uploaded successfully');

        // Update user state and local storage with the new tenant signature URL
        if (data.data && data.data.coSignatureUrl) {
          setUser((prevUser: any) => {
            const updatedUser = {
              ...prevUser,
              tenant: {
                ...prevUser.tenant,
                coSignatureUrl: data.data.coSignatureUrl
              }
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }

        loadData();
      } else {
        toast.error(data.message || 'Failed to upload signature');
      }
    } catch (err: any) {
      toast(err.message);
    } finally {
      setUploadingCoSignature(false);
      e.target.value = '';
    }
  };

  const handleSaveSettings = async () => {
    try {
      const formData = new FormData();
      formData.append('gstCalculationType', gstCalculationType);
      formData.append('gst', orgGst);
      formData.append('state', tenantState);
      formData.append('address', orgAddress);
      formData.append('mobile', orgMobile);
      formData.append('website', orgWebsite);
      formData.append('kycFirst', String(kycFirst));
      formData.append('welcomeEmailText', welcomeEmailText);
      formData.append('reportDisclaimer', reportDisclaimer);
      if (termsPdf) formData.append('termsPdf', termsPdf);
      if (internalPolicyPdf) formData.append('internalPolicyPdf', internalPolicyPdf);
      if (logoFile) formData.append('logo', logoFile);
      if (privacyPdf) formData.append('privacyPdf', privacyPdf);
      if (smtpHost) formData.append('smtpHost', smtpHost);
      if (smtpPort) formData.append('smtpPort', smtpPort);
      if (smtpUser) formData.append('smtpUser', smtpUser);
      if (smtpPassword) formData.append('smtpPassword', smtpPassword);
      if (smtpFrom) formData.append('smtpFrom', smtpFrom);
      if (bankAccountName) formData.append('bankAccountName', bankAccountName);
      if (bankAccountNo) formData.append('bankAccountNo', bankAccountNo);
      if (bankAccountType) formData.append('bankAccountType', bankAccountType);
      if (bankIfsc) formData.append('bankIfsc', bankIfsc);
      if (bankName) formData.append('bankName', bankName);
      if (bankBranch) formData.append('bankBranch', bankBranch);
      if (socialMediaLinks.length > 0) formData.append('socialMediaLinks', JSON.stringify(socialMediaLinks));
      if (digioClientId) formData.append('digioClientId', digioClientId);
      if (digioClientSecret) formData.append('digioClientSecret', digioClientSecret);
      if (digioKycTemplateName) formData.append('digioKycTemplateName', digioKycTemplateName);
      if (activePaymentGateway) formData.append('activePaymentGateway', activePaymentGateway);
      if (razorpayKeyId) formData.append('razorpayKeyId', razorpayKeyId);
      if (razorpayKeySecret) formData.append('razorpayKeySecret', razorpayKeySecret);
      if (cashfreeAppId) formData.append('cashfreeAppId', cashfreeAppId);
      if (cashfreeSecretKey) formData.append('cashfreeSecretKey', cashfreeSecretKey);
      if (ccavenueMerchantId) formData.append('ccavenueMerchantId', ccavenueMerchantId);
      if (ccavenueAccessCode) formData.append('ccavenueAccessCode', ccavenueAccessCode);
      if (ccavenueWorkingKey) formData.append('ccavenueWorkingKey', ccavenueWorkingKey);
      if (stripePublishableKey) formData.append('stripePublishableKey', stripePublishableKey);
      if (stripeSecretKey) formData.append('stripeSecretKey', stripeSecretKey);

      if (agreementContent) formData.append('agreementContent', agreementContent);

      const data = await api.updateTenantSettings(formData);
      if (data.success) {
        toast('Settings saved!');
        if (data.data) {
          setUser((prevUser: any) => {
            const updatedUser = { ...prevUser, tenant: data.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }
        loadData();
      }
      else { toast(data.message); }
    } catch (err: any) { toast(err.message); }
  };

  const handleTestSmtp = async () => {
    try {
      const email = prompt('Enter email address to send test email to:');
      if (!email) return;

      const data = await api.request('/admin/smtp-test', {
        method: 'POST',
        body: JSON.stringify({ toEmail: email })
      });
      if (data.success) {
        toast(data.message);
      } else {
        toast.error('Test Failed: ' + data.message);
      }
    } catch (err: any) {
      toast.error('Error testing SMTP: ' + err.message);
    }
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileNewPassword !== profileConfirmPassword) {
      toast('New passwords do not match!');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await api.changePassword({ currentPassword: profileCurrentPassword, newPassword: profileNewPassword });
      if (res.success) {
        toast.success('Password changed successfully! Redirecting to login...');
        setTimeout(() => {
          handleLogout();
        }, 1500);
      } else {
        toast.error(res.message || 'Failed to change password');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async (allDevices: boolean = false) => {
    await api.logout(allDevices);
    router.push('/login');
  };

  const handleRevertImpersonate = () => {
    const superAdminToken = localStorage.getItem('superAdminToken');
    const superAdminUser = localStorage.getItem('superAdminUser');
    if (superAdminToken && superAdminUser) {
      localStorage.setItem('accessToken', superAdminToken);
      localStorage.setItem('user', superAdminUser);
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
      localStorage.removeItem('tenantId');
      router.push('/super-admin');
    }
  };

  // Profile Onboarding Form Submits
  const handleSaveWizardStep = async (stepName: 'ORG' | 'PO' | 'CO' | 'POLICY', data: any) => {
    // Frontend validations
    setWizardErrors({});
    if (stepName === 'ORG') {
      if (!data.address || data.address.trim().length < 5) {
        setWizardErrors({ orgAddress: 'Address must be at least 5 characters long.' });
        return;
      }
      const websiteRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;
      if (!data.website || !websiteRegex.test(data.website)) {
        setWizardErrors({ orgWebsite: 'Please enter a valid website URL (e.g. example.com or https://example.com).' });
        return;
      }
      const mobileRegex = /^[0-9]{10}$/;
      if (!data.mobile || !mobileRegex.test(data.mobile)) {
        setWizardErrors({ orgMobile: 'Support mobile number must be a valid 10-digit number.' });
        return;
      }
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!data.gst || !gstRegex.test(data.gst)) {
        setWizardErrors({ orgGst: 'Please enter a valid 15-character Indian GSTIN (e.g. 22AAAAA1111A1Z1).' });
        return;
      }
    } else if (stepName === 'PO') {
      if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
        setWizardErrors({ poName: 'Principal Officer name must contain only letters and spaces (min 2 chars).' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email || !emailRegex.test(data.email)) {
        setWizardErrors({ poEmail: 'Please enter a valid email address.' });
        return;
      }
      const mobileRegex = /^[0-9]{10}$/;
      if (!data.mobile || !mobileRegex.test(data.mobile)) {
        setWizardErrors({ poMobile: 'Mobile number must be a valid 10-digit number.' });
        return;
      }
      if (!data.nismNumber || data.nismNumber.trim().length < 5) {
        setWizardErrors({ poNism: 'NISM Registration Number is required (min 5 chars).' });
        return;
      }
      if (!data.nismValidity || new Date(data.nismValidity) <= new Date()) {
        setWizardErrors({ poValidity: 'NISM validity expiry date must be in the future.' });
        return;
      }
    } else if (stepName === 'CO') {
      if (!data.name || data.name.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(data.name)) {
        setWizardErrors({ coName: 'Compliance Officer name must contain only letters and spaces (min 2 chars).' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email || !emailRegex.test(data.email)) {
        setWizardErrors({ coEmail: 'Please enter a valid email address.' });
        return;
      }
      const mobileRegex = /^[0-9]{10}$/;
      if (!data.mobile || !mobileRegex.test(data.mobile)) {
        setWizardErrors({ coMobile: 'Mobile number must be a valid 10-digit number.' });
        return;
      }
      if (!data.nismNumber || data.nismNumber.trim().length < 5) {
        setWizardErrors({ coNism: 'NISM Registration Number is required (min 5 chars).' });
        return;
      }
    }

    try {
      const res = await api.saveProfileStep(stepName, data);
      if (res.success) {
        // Use response data directly - don't wait for a separate loadData call
        const newScore: number = res.data.score;
        const newDetails: any = res.data.details;
        setCompleteness(newScore);
        setWizardDetails(newDetails);

        // Navigate to next incomplete step (or dashboard if complete)
        if (newScore >= 80) {
          // Profile is complete — isProfileComplete becomes true and dashboard renders
          // Optionally refresh other dashboard data in background
          loadData();
        } else {
          // Move to first incomplete step
          if (!newDetails.organization) setWizardStep(1);
          else if (!newDetails.principalOfficer) setWizardStep(2);
          else if (!newDetails.complianceOfficer) setWizardStep(3);
          else if (!newDetails.grievance) setWizardStep(4);
          else if (!newDetails.internalPolicy) setWizardStep(5);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save step.');
    }
  };

  const resetStaffForm = () => {
    setStaffName('');
    setStaffEmail('');
    setStaffMobile('');
    setStaffRole('RESEARCHER');
    setAssociatedType('SALES');
    setCustomAssociatedRole('');
    setStaffNism('');
    setStaffNismValidity('');
    setStaffNismFile(null);
    setStaffNismParsed(null);
    setNismParseMsg('');
    setIsParsingStaffNism(false);
    setEditingStaff(null);
  };

  const handleStaffNismFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.target;
    const file = inputElement.files?.[0] || null;
    setStaffNismFile(null);
    setStaffNismParsed(null);
    setNismParseMsg('');

    if (!file) return;

    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension || '')) {
      toast('Only image formats (PNG, JPG, JPEG) and PDF files are allowed.');
      inputElement.value = '';
      return;
    }

    setStaffNismFile(file);

    // Only auto-parse if it's a PDF
    if (file.type !== 'application/pdf') return;

    setIsParsingStaffNism(true);
    setNismParseMsg('');
    try {
      const formData = new FormData();
      formData.append('nismCertificate', file);
      const res = await api.adminParseNismCertificate(formData);

      if (res.success && res.data) {
        setStaffNismParsed(res.data);
        // Auto-fill whatever fields were extracted (editable by user)
        if (res.data.nismRegistration) setStaffNism(res.data.nismRegistration);
        if (res.data.nismValidity) setStaffNismValidity(res.data.nismValidity);
        if (res.data.name) setStaffName(res.data.name);
        setNismParseMsg(res.data.nismRegistration
          ? '✅ Details auto-filled from certificate'
          : '⚠️ Partial data extracted — please verify and fill remaining fields');
      } else {
        // Graceful fallback — no alert popup, just soft message
        setNismParseMsg(res.message || 'PDF uploaded. Please fill in NISM details manually.');
      }
    } catch (err: any) {
      setNismParseMsg('PDF uploaded. Please fill in NISM details manually.');
    } finally {
      setIsParsingStaffNism(false);
    }
  };

  const startEditStaff = (st: any) => {
    setEditingStaff(st);
    setStaffName(st.name || '');
    setStaffEmail(st.email || '');
    setStaffMobile(st.mobile || '');
    const rName = st.user?.role?.name;
    setStaffRole(['SALES', 'MARKETING'].includes(rName) ? 'PERSON_ASSOCIATED' : (rName || 'RESEARCHER'));
    if (st.personAssociated) {
      setAssociatedType(st.personAssociated.roleType || 'SALES');
      setCustomAssociatedRole(st.personAssociated.customRole || '');
    } else {
      setAssociatedType('SALES');
      setCustomAssociatedRole('');
    }
    setStaffNism(st.nismNumber || '');
    setStaffNismValidity(st.nismValidity ? new Date(st.nismValidity).toISOString().split('T')[0] : '');
    setStaffNismFile(null);
    setCreatedStaffCreds(null);
    setIsStaffModalOpen(true);
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleCreateOrUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingStaff) return;
    setIsSubmittingStaff(true);
    setCreatedStaffCreds(null);
    try {
      // Frontend Validations
      if (!staffName || staffName.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(staffName)) {
        toast('Staff name must contain only letters and spaces (min 2 chars).');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!staffEmail || !emailRegex.test(staffEmail)) {
        setWizardErrors({ coEmail: 'Please enter a valid email address.' });
        return;
      }
      const mobileRegex = /^[0-9]{10}$/;
      if (!staffMobile || !mobileRegex.test(staffMobile)) {
        setWizardErrors({ coMobile: 'Mobile number must be a valid 10-digit number.' });
        return;
      }
      if (staffNism && staffNism.trim().length > 0) {
        if (staffNism.trim().length < 5) {
          toast('NISM Registration Number must be at least 5 characters.');
          return;
        }
        if (isNismDuplicate) {
          toast('Duplicate NISM Certificate Number. Please enter a unique number.');
          return;
        }
        if (!staffNismValidity || new Date(staffNismValidity) <= new Date()) {
          toast('NISM validity expiry date must be in the future.');
          return;
        }
        if (!editingStaff && !staffNismFile) {
          toast('Please upload the NISM Certificate document.');
          return;
        }
      }

      if (staffNismFile) {
        const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
        const fileExtension = staffNismFile.name.split('.').pop()?.toLowerCase();
        if (!allowedExtensions.includes(fileExtension || '')) {
          toast('Only image formats (PNG, JPG, JPEG) and PDF files are allowed.');
          return;
        }
      }

      const formData = new FormData();
      formData.append('name', staffName);
      formData.append('email', staffEmail);
      formData.append('mobile', staffMobile);
      formData.append('roleName', staffRole);
      if (staffRole === 'PERSON_ASSOCIATED') {
        formData.append('personAssociatedType', associatedType);
      }
      if (staffRole === 'OTHER') {
        formData.append('hasError', 'false');
        formData.append('otherRoleName', customAssociatedRole);
      }
      formData.append('nismNumber', staffNism);
      formData.append('nismValidity', staffNismValidity);
      if (staffNismFile) {
        formData.append('nismUpload', staffNismFile);
      }

      let res;
      if (editingStaff) {
        res = await api.updateStaff(editingStaff.id, formData);
      } else {
        res = await api.createStaff(formData);
      }

      if (res.success) {
        if (!editingStaff) {
          setCreatedStaffCreds(res.data);
          setIsStaffModalOpen(false);
          resetStaffForm();
          setShowStaffCredsPopup(true);
        } else {
          toast.success('Staff member updated successfully!');
          setIsStaffModalOpen(false);
          resetStaffForm();
        }
        loadData();
      } else {
        toast.error(res.message || (res.errors && res.errors.join(', ')) || 'Staff operation failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Staff operation failed.');
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleToggleStaffStatus = (id: string) => {
    const member = staff.find(s => s.id === id);
    const actionName = member?.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
    triggerConfirm({
      title: actionName + ' Staff Member',
      message: 'Are you sure you want to ' + actionName.toLowerCase() + ' the staff member "' + (member?.name || '') + '"?',
      variant: 'warning',
      confirmLabel: 'Yes, ' + actionName,
      onConfirm: async () => {
        try {
          const res = await api.toggleStaffStatus(id);
          if (res.success) {
            loadData();
            toast(res.message);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to update status.');
        }
      }
    });
  };
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingComplaint(true);
      const res = await api.createComplaint({
        clientName: complaintClientName,
        clientEmail: complaintEmail,
        clientMobile: complaintMobile,
        clientPan: complaintPan,
        source: complaintSource,
        subject: complaintSubject,
        description: complaintDescription,
        receivedAt: complaintReceivedAt ? new Date(complaintReceivedAt).toISOString() : new Date().toISOString()
      });
      if (res.success || res.id) {
        setIsComplaintModalOpen(false);
        setComplaintClientName('');
        setComplaintEmail('');
        setComplaintMobile('');
        setComplaintPan('');
        setComplaintSource('MANUAL');
        setComplaintSubject('');
        setComplaintDescription('');
        setComplaintReceivedAt('');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create complaint');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const handleDeleteStaff = (id: string) => {
    const member = staff.find(s => s.id === id);
    triggerConfirm({
      title: 'Delete Staff Member',
      message: 'Are you sure you want to delete the staff member "' + (member?.name || '') + '"? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await api.deleteStaff(id);
          if (res.success) {
            loadData();
            toast.success('Staff member soft-deleted successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete staff.');
        }
      }
    });
  };

  const handleRestoreStaff = (id: string) => {
    const member = staff.find(s => s.id === id);
    triggerConfirm({
      title: 'Restore Staff Member',
      message: 'Are you sure you want to restore the staff member "' + (member?.name || '') + '"?',
      variant: 'success',
      confirmLabel: 'Yes, Restore',
      onConfirm: async () => {
        try {
          const res = await api.restoreStaff(id);
          if (res.success) {
            loadData();
            toast.success('Staff member restored successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to restore staff.');
        }
      }
    });
  };

  // Compliance sweep run
  const handleComplianceSweep = async () => {
    triggerConfirm({
      title: 'Run Compliance Sweep',
      message: 'Are you sure you want to run a compliance sweep?',
      confirmLabel: 'Yes, Run Sweep',
      onConfirm: async () => {
        setSweepLoading(true);
        try {
          const res = await api.runComplianceCheck();
          if (res.success) {
            loadData();
            toast(`Sweep done. ${res.alertsGenerated} alert(s) generated.`);
          }
        } catch (err: any) {
          toast.error(err.message || 'Sweep failed.');
        } finally {
          setSweepLoading(false);
        }
      }
    });
  };

  const handleDownloadPeriodicReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setDownloadingReport(true);
    try {
      let startDateStr, endDateStr, periodName;

      // H1: April 1 to September 30
      // H2: October 1 to March 31 of next year
      if (reportHalf === 'H1') {
        startDateStr = `${reportYear}-04-01T00:00:00.000Z`;
        endDateStr = `${reportYear}-09-30T23:59:59.999Z`;
        periodName = `Apr-Sep_${reportYear}`;
      } else {
        startDateStr = `${reportYear}-10-01T00:00:00.000Z`;
        endDateStr = `${reportYear + 1}-03-31T23:59:59.999Z`;
        periodName = `Oct-Mar_${reportYear}-${reportYear + 1}`;
      }

      const res = await api.getPeriodicReportData(startDateStr, endDateStr);
      console.log("RECEIVED REPORT DATA:", res.data);
      if (res.success) {
        generatePeriodicReport(res.data, periodName, endDateStr);
        setShowReportModal(false);
      } else {
        toast.error(res.message || 'Failed to fetch report data.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error generating report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleAuditUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditModalReq || !auditStatus) return;
    triggerConfirm({
      title: 'Update Audit Status',
      message: 'Are you sure you want to update the audit status?',
      confirmLabel: 'Yes, Update',
      onConfirm: async () => {
        setResolveLoading(true);
        try {
          const fd = new FormData();
          fd.append('status', auditStatus);
          fd.append('officerRemarks', auditRemarks);
          if (auditProof) {
            fd.append('proofDocumentUrl', auditProof);
          }
          const res = await api.updateAuditStatus(auditModalReq.id, fd);
          if (res.success) {
            setAuditModalReq(null); setAuditStatus(''); setAuditRemarks(''); setAuditPenaltyAmt(''); setAuditProof(null);
            loadData();
            toast.success('Audit status updated successfully.');
          } else {
            toast.error(res.message || 'Failed to update.');
          }
        } catch (err: any) { toast(err.message); }
        finally { setResolveLoading(false); }
      }
    });
  };

  const handlePenaltyResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penaltyResolutionType) {
      toast('Resolution Type is mandatory.');
      return;
    }
    if (!penaltyProof) {
      toast('Proof document is mandatory.');
      return;
    }
    if (penaltyResolutionType === 'Paid' && (!penaltyResolveId || !penaltyPayRef.trim())) {
      toast('Transaction Reference is mandatory when resolving as Paid.');
      return;
    }
    if (!penaltyRemarks.trim()) {
      toast('Remarks are mandatory.');
      return;
    }
    triggerConfirm({
      title: 'Resolve Penalty',
      message: 'Are you sure you want to resolve this penalty?',
      confirmLabel: 'Yes, Resolve',
      onConfirm: async () => {
        setResolveLoading(true);
        try {
          const fd = new FormData();
          fd.append('resolutionType', penaltyResolutionType);
          if (penaltyResolutionType === 'Paid') {
            fd.append('paymentRef', penaltyPayRef);
          }
          if (penaltyProof) fd.append('proof', penaltyProof);
          fd.append('remarks', penaltyRemarks);
          const res = await api.resolvePenalty(penaltyResolveId!, fd);
          if (res.success) {
            setPenaltyResolveId(null); setPenaltyResolutionType(''); setPenaltyPayRef(''); setPenaltyProof(null); setPenaltyRemarks('');
            loadData();
            toast.success('Penalty resolved successfully.');
          } else {
            toast.error(res.message || 'Failed to resolve.');
          }
        } catch (err: any) { toast(err.message); }
        finally { setResolveLoading(false); }
      }
    });
  };

  const handleComplaintResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintResolveId || !complaintAtrRemarks.trim() || !complaintAtrProof) {
      toast('ATR Proof document and Remarks are mandatory to resolve a complaint.');
      return;
    }
    setComplaintResolveLoading(true);
    try {
      const fd = new FormData();
      fd.append('remarks', complaintAtrRemarks);
      fd.append('proof', complaintAtrProof);
      const res = await api.resolveComplaint(complaintResolveId, fd);
      if (res.success) {
        setComplaintResolveId(null);
        setComplaintAtrProof(null);
        setComplaintAtrRemarks('');
        loadData();
        toast.success('Complaint resolved and ATR uploaded successfully.');
      } else {
        toast.error(res.message || res.error || 'Failed to resolve complaint.');
      }
    } catch (err: any) { toast.error(err.message || 'Failed to resolve complaint.'); }
    finally { setComplaintResolveLoading(false); }
  };

  // Resolve Alert Close
  const handleCloseAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingAlertId) return;

    triggerConfirm({
      title: 'Close Alert',
      message: 'Are you sure you want to close this compliance alert?',
      confirmLabel: 'Yes, Close',
      onConfirm: async () => {
        const formData = new FormData();
        formData.append('remarks', closeRemarks);
        formData.append('actualDepositAmount', depositTopup);
        if (alertProof) {
          formData.append('proof', alertProof);
        }

        try {
          const res = await api.closeComplianceAlert(closingAlertId, formData);
          if (res.success) {
            loadData();
            setClosingAlertId(null);
            setCloseRemarks('');
            setAlertProof(null);
            toast.success('Alert closed successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to close alert.');
        }
      }
    });
  };

  const handleResolveAlert = (alertId: string, alertType: string) => {
    const isDbChecked = ['KYC_MISSING', 'KYC_FAILED', 'AGREEMENT_MISSING', 'PAN_MISSING'].includes(alertType);

    const title = isDbChecked
      ? `Verify & Resolve ${alertType.replace(/_/g, ' ')}`
      : 'Resolve Compliance Alert';

    const message = isDbChecked
      ? `This will verify the client's current status in the database. If the condition is met, the alert will close. Are you sure you want to proceed?`
      : 'Are you sure you want to resolve this compliance alert?';

    triggerConfirm({
      title,
      message,
      variant: isDbChecked ? 'info' : 'warning',
      confirmLabel: isDbChecked ? 'Verify & Resolve' : 'Yes, Resolve',
      onConfirm: async () => {
        const formData = new FormData();
        const remarks = isDbChecked
          ? `Resolved via database verification. Checked ${alertType.replace(/_/g, ' ')}.`
          : (alertType === 'DEPOSIT_LOW' ? 'Deposit float topped up by admin' : closeRemarks);

        formData.append('remarks', remarks);
        if (alertType === 'DEPOSIT_LOW') {
          formData.append('actualDepositAmount', depositTopup);
        }

        try {
          const res = await api.closeComplianceAlert(alertId, formData);
          if (res.success) {
            loadData();
            setCloseRemarks('');
            setDepositTopup('50000');
            toast.success('Alert resolved successfully.');
          } else {
            toast.error(res.message || 'Failed to resolve alert.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to resolve alert.');
        }
      }
    });
  };

  // Verify Manual Payment
  const handleVerifyPayment = (paymentId: string, status: 'SUCCESS' | 'FAILED') => {
    const actionText = status === 'SUCCESS' ? 'Approve' : 'Reject';
    triggerConfirm({
      title: (status === 'SUCCESS' ? 'Approve' : 'Reject') + ' Payment',
      message: "Are you sure you want to " + (status === 'SUCCESS' ? 'approve' : 'reject') + " this payment? This will update the client's subscription plan.",
      variant: status === 'SUCCESS' ? 'success' : 'danger',
      confirmLabel: 'Yes, ' + (status === 'SUCCESS' ? 'Approve' : 'Reject'),
      onConfirm: async () => {
        try {
          const res = await api.verifyManualPayment({
            paymentId,
            status,
            remarks: 'Verified by Compliance Staff'
          });
          if (res.success) {
            loadData();
            toast('Payment verified as ' + status);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to verify payment.');
        }
      }
    });
  };

  const handleCloseAdminTicket = (ticketId: string) => {
    triggerConfirm({
      title: 'Close Ticket',
      message: 'Are you sure you want to close this ticket? It cannot be reopened.',
      variant: 'danger',
      confirmLabel: 'Yes, Close',
      onConfirm: async () => {
        try {
          const res = await api.closeAdminTicket(ticketId);
          if (res.success) {
            toast.success('Ticket closed successfully.');
            const res2 = await api.getAdminTicket(ticketId);
            if (res2.success) setSelectedAdminTicket(res2.data);
            const listRes = await api.listAdminTickets();
            if (listRes.success) setAdminTickets(listRes.data);
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to close ticket');
        }
      }
    });
  };

  // Create Research
  const handleCreateResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createResearch({
        segment: resSegment,
        type: resType,
        title: resTitle,
        summary: resSummary,
        details: resDetails,
        recommendation: resRecommendation,
        targetPrice: resTarget
      });
      if (res.success) {
        loadData();
        setResTitle('');
        setResSummary('');
        setResDetails('');
        setResTarget('');
        toast.success('Research recommendation created as Draft!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create research.');
    }
  };

  // Publish Research
  const handlePublishResearch = async () => {
    if (!checklistReportId) return;
    setPublishError(null);

    try {
      const res = await api.publishResearch(checklistReportId, {
        acceptTnc: chkTnc,
        acceptPolicy: chkPolicy,
        acceptConsent: chkConsent
      });
      if (res.success) {
        loadData();
        setChecklistReportId(null);
        setChkTnc(false);
        setChkPolicy(false);
        setChkConsent(false);
        toast('Research call published to all subscribed clients!');
      }
    } catch (err: any) {
      setPublishError(err.message || 'Failed to publish research.');
    }
  };

  const startEditClient = (cl: any) => {
    setEditingClient(cl);
    setEditClientName(cl.name || '');
    setEditClientEmail(cl.email || '');
    setEditClientMobile(cl.mobile || '');
    setEditClientPan(cl.pan || '');
    setEditClientAadhaar(cl.aadhaar || '');
    setEditClientCategory(cl.category || 'INDIVIDUAL');
    setEditClientOccupation(cl.occupation || '');
    setEditClientAddress(cl.profile?.addressLine1 || '');
    setEditClientCity(cl.profile?.city || '');
    setEditClientState(cl.profile?.state || '');
    setEditClientZip(cl.profile?.zipCode || '');
    setIsEditClientModalOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId);
    triggerConfirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete the client "' + (cl?.name || 'this client') + '"? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        try {
          const res = await api.deleteAdminClient(clientId);
          if (res.success) {
            loadData();
            toast.success('Client soft-deleted successfully.');
            // If the deleted client was selected, close their detail modal
            if (selectedClient && selectedClient.id === clientId) {
              setSelectedClient(null);
              setIsViewClientModalOpen(false);
            }
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to delete client.');
        }
      }
    });
  };

  const handleApproveClient = async (clientId: string) => {
    triggerConfirm({
      title: 'Approve Client',
      message: 'Are you sure you want to approve this client? A welcome email will be sent.',
      confirmLabel: 'Yes, Approve',
      onConfirm: async () => {
        try {
          const res = await api.approveClient(clientId);
          if (res.success) {
            loadData();
            toast.success('Client approved successfully. Welcome email sent.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to approve client.');
        }
      }
    });
  };

  const handleRestoreClient = (clientId: string) => {
    const cl = clients.find(c => c.id === clientId);
    triggerConfirm({
      title: 'Restore Client',
      message: 'Are you sure you want to restore the client "' + (cl?.name || 'this client') + '"?',
      variant: 'success',
      confirmLabel: 'Yes, Restore',
      onConfirm: async () => {
        try {
          const res = await api.restoreAdminClient(clientId);
          if (res.success) {
            loadData();
            toast.success('Client restored successfully.');
          }
        } catch (err: any) {
          toast.error(err.message || 'Failed to restore client.');
        }
      }
    });
  };

  const handleToggleClientStatus = (clientId: string, currentStatus: string, clientName: string) => {
    const actionName = currentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate';
    triggerConfirm({
      title: actionName + ' Client',
      message: 'Are you sure you want to ' + actionName.toLowerCase() + ' client "' + clientName + '"?',
      variant: 'warning',
      confirmLabel: 'Yes, ' + actionName,
      onConfirm: async () => {
        try {
          const r = await api.toggleAdminClientStatus(clientId);
          if (r.success) {
            loadData();
            toast(r.message);
          }
        } catch (e: any) {
          toast.error(e.message || 'Failed to update client status.');
        }
      }
    });
  };

  const handleUpdateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClientName.trim() || editClientName.trim().length < 2) {
      toast('Full name must be at least 2 characters.'); return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(editClientEmail)) {
      setWizardErrors({ coEmail: 'Please enter a valid email address.' }); return;
    }
    if (!/^\d{10}$/.test(editClientMobile)) {
      toast('Mobile number must be exactly 10 digits.'); return;
    }
    const panRx = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRx.test(editClientPan)) {
      toast('PAN must be in format: ABCDE1234F (10 characters).'); return;
    }
    if (!/^\d{12}$/.test(editClientAadhaar)) {
      toast('Aadhaar number must be exactly 12 digits.'); return;
    }

    setEditClientModalLoading(true);
    try {
      const payload = {
        name: editClientName.trim(),
        email: editClientEmail.trim(),
        mobile: editClientMobile.trim(),
        pan: editClientPan.toUpperCase(),
        aadhaar: editClientAadhaar,
        category: editClientCategory,
        occupation: editClientOccupation || undefined,
        addressLine1: editClientAddress || undefined,
        city: editClientCity || undefined,
        state: editClientState || undefined,
        zipCode: editClientZip || undefined
      };
      const r = await api.updateAdminClient(editingClient.id, payload);
      if (r.success) {
        setIsEditClientModalOpen(false);
        loadData();
        toast.success('Client details updated successfully!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update client.');
    } finally {
      setEditClientModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-500 mb-4" />
        <span>Loading Advisor Dashboard...</span>
      </div>
    );
  }

  // Profile Wizard Check
  const isProfileComplete = completeness >= 80;

  const renderPermissionCheckbox = (code: string, title: string, desc: string, dependencyCode?: string) => {
    const isChecked = selectedRole?.permissions?.includes(code) || false;
    const isDisabled = selectedRole ? ['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) : false;
    const isParentChecked = dependencyCode ? (selectedRole?.permissions?.includes(dependencyCode) || false) : true;

    // If dependency is not checked, disable the sub-permission checkbox (unless editing is locked completely)
    const effectivelyDisabled = isDisabled || (!isParentChecked && !isDisabled);

    return (
      <div
        onClick={() => {
          if (!effectivelyDisabled) {
            handleTogglePermission(code);
          }
        }}
        className={`p-3.5 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${isChecked
          ? 'bg-primary-500/5 border-primary-500/20'
          : 'bg-slate-100 dark:bg-slate-950/20 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10'
          } ${effectivelyDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={effectivelyDisabled}
          onChange={() => { }} // handled by click handler
          className="mt-1 h-3.5 w-3.5 rounded border-slate-400 dark:border-white/10 text-primary-600 focus:ring-primary-500 bg-white dark:bg-slate-900 cursor-pointer"
        />
        <div className="flex-grow">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{title}</span>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">{desc}</p>
          <span className={`inline-block text-[9px] font-bold mt-2 px-1.5 py-0.5 rounded font-mono ${isChecked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
            }`}>
            {isChecked ? 'ALLOWED' : 'BLOCKED'}
          </span>
        </div>
      </div>
    );
  };

  const upcomingAlerts = checklist.filter((item: any) => {
    if (item.audit && item.audit.status !== 'PENDING') return false;
    const dueDateMs = item.currentPeriod?.dueDate ? new Date(item.currentPeriod.dueDate).getTime() : null;
    if (!dueDateMs) return false;
    const daysLeft = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
    return daysLeft >= 0 && daysLeft <= 7;
  }).map((item: any) => ({
    id: item.id,
    title: `Checklist Task #${item.serialNo}`,
    description: item.requirement,
    deadlineAt: item.currentPeriod.dueDate
  })).sort((a: any, b: any) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());

  const overdueAlerts = checklist.filter((item: any) => {
    if (item.audit?.status === 'OVERDUE') return true;
    if (item.audit && item.audit.status !== 'PENDING') return false;
    const dueDateMs = item.currentPeriod?.dueDate ? new Date(item.currentPeriod.dueDate).getTime() : null;
    if (!dueDateMs) return false;
    const daysLeft = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
    return daysLeft < 0;
  });

  const handleBulkExport = async (type: string, isZip: boolean) => {
    try {
      setExportLoading(type);
      const API_URL = (process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend/api/v1' : api.getBaseUrl() + '/api/v1';
      let url = `${API_URL}/admin/exports/${type}`;
      if (exportRange === 'date' && exportStartDate && exportEndDate) {
        url += `?range=date&startDate=${exportStartDate}&endDate=${exportEndDate}`;
      }

      const token = localStorage.getItem('accessToken');
      const headers: HeadersInit = { 'Authorization': 'Bearer ' + token };
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        headers['x-tenant-id'] = tenantId;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = exportRange === 'date' ? `_${exportStartDate}_to_${exportEndDate}` : '';
      link.setAttribute('download', `${type}${dateStr}.${isZip ? 'zip' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>

      <div className="h-screen h-dvh overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex relative">
        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-premium-cards border border-premium-border flex items-center justify-center"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5 text-premium-text" /> : <Menu className="w-5 h-5 text-premium-text" />}
        </button>

        {/* Premium Sidebar (Blue in Light Mode) */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col shrink-0 ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
          } ${!isMobileMenuOpen && isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>

          {/* Brand */}
          <div className={`h-24 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              {user?.tenantLogo ? (
                <img src={user.tenantLogo} alt={user?.tenantName || appName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[32px]' : 'max-w-[180px]'}`} />
              ) : appLogo ? (
                <img src={appLogo} alt={appName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[32px]' : 'max-w-[180px]'}`} />
              ) : (
                <>
                  <img src="/logo-light.png" alt={appName} className={`dark:hidden object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                  <img src="/logo-dark.png" alt={appName} className={`hidden dark:block object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                </>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
            {NAV_CONFIG.map((mod) => {
              if (!hasPermission(mod.accessKey)) return null;
              if (mod.tab === 'signature_settings' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN')) return null;
              const Icon = ICON_MAP[mod.icon] || Layers;

              if (mod.tab === 'customPages') {
                return (
                  <div key={mod.tab} className="pt-2">
                    <button
                      onClick={() => {
                        if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                        setIsPagesExpanded(!isPagesExpanded);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                      title={isSidebarCollapsed ? mod.label : undefined}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Icon className="w-5 h-5 text-blue-200 dark:text-white/50 group-hover:text-white shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{mod.label}</span>}
                      </div>
                      {!isSidebarCollapsed && (
                        <div className={`transition-transform duration-200 ${isPagesExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </button>

                    {!isSidebarCollapsed && isPagesExpanded && (
                      <div className="pl-12 pr-4 space-y-1 mt-1">
                        {adminPagesList.filter((page: any) => page.slug !== 'complaint-status').map((page: any) => (
                          <button
                            key={page.id}
                            onClick={() => {
                              setActiveTab(`customPages_${page.slug}`);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === `customPages_${page.slug}`
                              ? 'bg-white/20 text-white font-medium shadow-inner'
                              : 'text-blue-100 dark:text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                          >
                            {page.title}
                          </button>
                        ))}
                        {!isStaff && (
                          <button
                            onClick={() => setActiveTab('customPages_new')}
                            className="w-full text-left px-3 py-2 text-xs rounded-lg transition font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 mt-2"
                          >
                            + Add New Page
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = activeTab === mod.tab;
              return (
                <button
                  key={mod.tab}
                  onClick={() => {
                    setActiveTab(mod.tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-white/20 text-white font-semibold shadow-inner'
                    : 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white'
                    } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={isSidebarCollapsed ? mod.label : undefined}
                >
                  <Icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-blue-200 dark:text-white/50 group-hover:text-white'}`} />
                  {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{mod.label}</span>}
                  {!isSidebarCollapsed && isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  )}
                </button>
              );
            })}

            {user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && (
              <button
                onClick={() => { setActiveTab('legalView'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'legalView'
                  ? 'bg-white/20 text-white font-semibold shadow-inner'
                  : 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? "Legal & Disclosures" : undefined}
              >
                <FileText className={`w-5 h-5 transition-colors shrink-0 ${activeTab === 'legalView' ? 'text-white' : 'text-blue-200 dark:text-white/50 group-hover:text-white'}`} />
                {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">Legal & Disclosures</span>}
                {!isSidebarCollapsed && activeTab === 'legalView' && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                )}
              </button>
            )}
          </div>

          {/* User Footer */}
          <div className={`p-4 border-t border-blue-800 dark:border-premium-border relative overflow-hidden flex flex-col ${isSidebarCollapsed ? 'px-2' : ''}`}>
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />

            <div
              onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
              className={`bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-3 border border-white/10 hover:border-white/30 transition-all duration-300 group relative overflow-hidden cursor-pointer ${isSidebarCollapsed ? 'p-2 justify-center flex-col' : 'p-4'}`}>

              {/* Shimmer effect inside the card */}
              <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite]" />

              <div className="relative shrink-0">
                {/* Pulsing ring around avatar */}
                <div className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-ping opacity-75" />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-[0_0_10px_var(--tw-colors-rose-500)] relative z-10 text-lg">
                  {user?.firstName ? user.firstName.trim().charAt(0).toUpperCase() : (user?.name ? user.name.trim().charAt(0).toUpperCase() : 'A')}
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-premium-success border-2 border-premium-bg rounded-full z-20" />
              </div>

              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="font-bold text-sm truncate text-white">{user?.firstName || user?.name || 'Admin'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-rose-500" />
                    <p className="text-[10px] font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-orange-200 to-rose-500 animate-pulse">
                      {user?.role || 'Staff'}
                    </p>
                  </div>
                </div>
              )}

              {!isSidebarCollapsed && (
                <div
                  className="relative z-10 shrink-0 mr-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ThemeToggle />
                </div>
              )}
            </div>
            <div className={`flex-1 mt-4 border-t border-white/10 ${isSidebarCollapsed ? 'p-2' : 'pt-4'}`}>
              <button onClick={() => setIsLogoutModalOpen(true)} className={`w-full flex items-center hover:bg-rose-500/20 rounded-xl text-blue-100 dark:text-white/60 hover:text-rose-400 transition-all group ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between p-3'}`} title={isSidebarCollapsed ? "Sign Out" : undefined}>
                {!isSidebarCollapsed && <span className="font-semibold text-sm">Sign Out</span>}
                <LogOut className={`w-4 h-4 transition-transform ${!isSidebarCollapsed ? 'group-hover:translate-x-1' : ''}`} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 h-dvh flex flex-col overflow-hidden w-full bg-slate-50 dark:bg-slate-950">
          {user?.isImpersonated && (
            <button
              onClick={handleRevertImpersonate}
              className="fixed top-4 right-16 z-50 px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition flex items-center space-x-1.5 font-semibold shadow-lg"
              title="Back to Super Admin"
            >
              <LogOut className="h-3.5 w-3.5 rotate-180" />
              <span className="hidden sm:inline">Back to Super Admin</span>
            </button>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full h-full">

              {/* ====================================================
            PROFILE COMPLETENESS WIZARD (Only for ADMIN, if completeness < 80%)
           ==================================================== */}
              {!isProfileComplete && user.role === 'ADMIN' && !user?.isImpersonated && (
                <div className="max-w-3xl mx-auto space-y-8 mt-6">
                  <div className="p-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl text-xs space-y-2">
                    <h3 className="font-bold text-sm">Action Required: Profile Wizard Completeness is below 80%</h3>
                    <p>Your current completion score is <strong>{completeness}%</strong>. In accordance with SEBI compliance, client onboarding and research publishing features are locked until your profile reaches 80% completion.</p>
                  </div>

                  <div className="glassmorphism p-8 rounded-2xl border border-slate-400 dark:border-white/10 space-y-6">
                    <h2 className="text-lg font-bold">Profile Setup Wizard - Step {wizardStep} of 5</h2>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500" style={{ width: `${(wizardStep / 5) * 100}%` }} />
                    </div>

                    {/* Step 1: Org details */}
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 1: Organization Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Corporate Address <span className="text-red-500">*</span></label>
                            <input type="text" value={orgAddress} onChange={e => setOrgAddress(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="Corporate HQ location" />
                            {wizardErrors.orgAddress && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgAddress}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Corporate Website <span className="text-red-500">*</span></label>
                            <input type="text" value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="www.alpharesearch.com" />
                            {wizardErrors.orgWebsite && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgWebsite}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Support Mobile <span className="text-red-500">*</span></label>
                            <input type="text" value={orgMobile} onChange={e => setOrgMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="Support mobile" />
                            {wizardErrors.orgMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">GST Number <span className="text-red-500">*</span></label>
                            <input type="text" value={orgGst} onChange={e => setOrgGst(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="GST Number" />
                            {wizardErrors.orgGst && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgGst}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('ORG', { address: orgAddress, website: orgWebsite, mobile: orgMobile, gst: orgGst })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 2: Principal Officer */}
                    {wizardStep === 2 && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 2: Principal Officer Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Full Name</label>
                            <input type="text" value={poName} onChange={e => setPoName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="PO Name" />
                            {wizardErrors.poName && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Email</label>
                            <input type="email" value={poEmail} onChange={e => setPoEmail(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="po@company.com" />
                            {wizardErrors.poEmail && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poEmail}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Mobile</label>
                            <input type="text" value={poMobile} onChange={e => setPoMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="PO Mobile" />
                            {wizardErrors.poMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO NISM Registration No</label>
                            <input type="text" value={poNism} onChange={e => setPoNism(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="NISM-889012" />
                            {wizardErrors.poNism && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poNism}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Validity Date</label>
                            <input type="date" value={poValidity} onChange={e => setPoValidity(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs text-slate-600 dark:text-slate-400" />
                            {wizardErrors.poValidity && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poValidity}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('PO', { name: poName, email: poEmail, mobile: poMobile, nismNumber: poNism, nismValidity: poValidity })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 3: Compliance Officer */}
                    {wizardStep === 3 && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 3: Compliance Officer Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Compliance Officer Name</label>
                            <input type="text" value={coName} onChange={e => setCoName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="CO Name" />
                            {wizardErrors.coName && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Email</label>
                            <input type="email" value={coEmail} onChange={e => setCoEmail(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="co@company.com" />
                            {wizardErrors.coEmail && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coEmail}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Mobile</label>
                            <input type="text" value={coMobile} onChange={e => setCoMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="CO Mobile" />
                            {wizardErrors.coMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Membership Registration</label>
                            <input type="text" value={coNism} onChange={e => setCoNism(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="NISM-CO-998811" />
                            {wizardErrors.coNism && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coNism}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('CO', { name: coName, email: coEmail, mobile: coMobile, nismNumber: coNism })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 4: Grievance & Escilations */}
                    {wizardStep === 4 && (
                      <div className="space-y-4">
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
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 5: Internal Policies Upload */}
                    {wizardStep === 5 && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 5: Internal Governance Policy Upload</h3>
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">Upload combined PDF (Internal Control, Conflict policy, AML policy)</label>
                          <div className="border border-dashed border-slate-400 dark:border-white/10 rounded-xl p-6 text-center bg-slate-100 dark:bg-white/5">
                            <UploadCloud className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
                            <span className="text-xs text-slate-700 dark:text-slate-300">Drag or click to mock upload policy document</span>
                            <input type="text" value={policyUrl} onChange={e => setPolicyUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs mt-3 font-mono" placeholder="Policy PDF URL (Mock)" />
                            {wizardErrors.policyUrl && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.policyUrl}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('POLICY', { internalPolicyUrl: policyUrl || '/uploads/policies/comb_policy.pdf' })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Complete Wizard</span> <CheckCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ====================================================
            DASHBOARD VIEW (If completeness >= 80% OR non-ADMIN role)
           ==================================================== */}
              {(isProfileComplete || user.role !== 'ADMIN' || user?.isImpersonated) && (
                <div className="space-y-8">
                  {/* UNIFIED PAGE HEADER FOR TABS WITHOUT NATIVE HEADERS */}
                  {(() => {
                    const currentNav = NAV_CONFIG.find(n =>
                      n.tab === activeTab ||
                      (activeTab.startsWith('customPages_') && n.tab === 'customPages')
                    );

                    // if (!currentNav || activeTab === 'dashboard') return null;

                    const tabsMissingHeader = [
                      "dashboard",
                      "staff",
                      "clients",
                      "plans",
                      "research",
                      "research-reports",
                      "payments",
                      "checklist",
                      "compliance",
                      "tickets",
                      "settings",
                      "customPages",
                      "complaintReport",
                      "roles",
                      "auditLogs",
                      "signature_settings",
                      "resources"
                    ];

                    if (!tabsMissingHeader.includes(activeTab) && !activeTab.startsWith('customPages_')) {
                      return null;
                    }

                    return (
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-300 dark:border-white/10 pb-4 mb-2">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {activeTab.startsWith('customPages_')
                              ? adminPagesList?.find((p: any) => p.slug === activeTab.split('_')[1])?.title || 'Custom Page'
                              : currentNav?.label}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {currentNav?.moduleDesc || 'Manage and view details for this section.'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* PROFILE TAB */}
                  {activeTab === 'profile' && (
                    <>
                      {user?.role === 'ADMIN' && <AdminProfilePage />}
                      {(user?.role === 'STAFF' || user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'RESEARCHER') && <StaffProfilePage />}
                      {user?.role === 'PRINCIPAL_ANALYST' && <PAProfilePage />}
                    </>
                  )}

                  {/* DASHBOARD WIDGETS TAB */}
                  {activeTab === 'dashboard' && (
                    <div className="space-y-8">
                      {/* Stats Widgets */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {(!isStaff || hasPermission('ACCESS_RESEARCH')) && (
                          <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Research Calls' : 'Published Recommendations'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.researchCount}
                              </p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                          </div>
                        )}

                        {(!isStaff || hasPermission('ACCESS_STAFF')) && (
                          <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Staff Directory</span>
                              <p className="text-3xl font-extrabold mt-1">{dashboardStats.staffCount}</p>
                            </div>
                            <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400">
                              <Users className="h-5 w-5" />
                            </div>
                          </div>
                        )}

                        {(!isStaff || hasPermission('ACCESS_CLIENTS') || hasPermission('VIEW_OWN_CLIENTS') || hasPermission('VIEW_ALL_CLIENTS')) && (
                          <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Onboarded Clients' : 'Total Client Directory'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.clientCount}
                              </p>
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                              <Users className="h-5 w-5" />
                            </div>
                          </div>
                        )}

                        {(!isStaff || hasPermission('ACCESS_PLANS') || hasPermission('VIEW_OWN_PLANS') || hasPermission('VIEW_ALL_PLANS')) && (
                          <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Created Plans' : 'Subscription Plans'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.planCount}
                              </p>
                            </div>
                            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                              <ClipboardList className="h-5 w-5" />
                            </div>
                          </div>
                        )}

                        {isStaff && (
                          <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Assigned SEBI Role</span>
                              <p className="text-sm font-extrabold mt-3 uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                {user.role.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Compliance Action Center (Upcoming & Overdue Alerts) */}
                      {(!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Upcoming Compliance Alerts (Next 7 Days)</h3>
                              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold">
                                {upcomingAlerts.length} Action(s) Required
                              </span>
                            </div>
                            <div className="flex-grow space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                              {upcomingAlerts.length > 0 ? (
                                <>
                                  {upcomingAlerts.slice(0, 10).map((alert: any) => {
                                    const daysLeft = Math.ceil((new Date(alert.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                                    return (
                                      <div key={alert.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 transition">
                                        <div>
                                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200" title={alert.description}>{(alert.description || '').substring(0, 80)}{alert.description?.length > 80 ? '...' : ''}</h4>
                                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{alert.title}</p>
                                        </div>
                                        <div className="text-right whitespace-nowrap ml-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${daysLeft <= 2 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                            Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {upcomingAlerts.length > 10 && (
                                    <button onClick={() => window.dispatchEvent(new CustomEvent('nav-to-upcoming'))} className="w-full text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white py-2 mt-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-300 dark:border-white/5 rounded-lg transition">
                                      View all {upcomingAlerts.length} upcoming alerts <ArrowRight className="inline h-3 w-3 ml-1" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-500">
                                  No upcoming alerts for the next 7 days.
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="glassmorphism p-6 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-500/5 transition group"
                            onClick={() => {
                              // Navigate to Compliance Desk -> Automated Alerts -> Active
                              if (typeof window !== 'undefined') window.location.hash = 'compliance';
                              // State setters will be called by the hash listener or directly here
                              // But since we are already on dashboard, we can just call setters directly too
                              setTimeout(() => {
                                const btn = document.getElementById('btn-compliance-tab');
                                if (btn) btn.click();
                                // We might not have access to setAlertsSubTab directly here if it's deep inside, 
                                // wait, we are in AdminPortal component, we don't have setComplianceTab in scope here?
                                // Let's just use the hash! The hash change to #compliance will switch the tab.
                                // And we can trigger a custom event or just let them navigate to compliance.
                                window.dispatchEvent(new CustomEvent('nav-to-overdue'));
                              }, 0);
                            }}>
                            <div className="p-4 bg-rose-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-500" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Overdue Alerts</h3>
                            <p className="text-5xl font-extrabold text-rose-600 dark:text-rose-500 my-2">{overdueAlerts.length}</p>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400/80 group-hover:text-rose-600 dark:text-rose-400 flex items-center mt-2">
                              Click to view all overdue <ArrowRight className="h-3 w-3 ml-1" />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Dashboard grid (Compliance Analytics & Penalty Matrix) */}
                      {(!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (() => {
                        // Compute data for compliance health
                        const compliantCount = checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length;
                        const nonCompliantCount = checklist.filter((item: any) => item.audit?.status === 'NON_COMPLIANT').length;
                        const pendingCount = checklist.filter((item: any) => !item.audit || item.audit?.status === 'PENDING').length;
                        const overdueCount = checklist.filter((item: any) => item.audit?.status === 'OVERDUE').length;
                        const resolvedCount = checklist.filter((item: any) => item.audit?.status === 'PENALTY_RESOLVED').length;

                        const complianceChartData = [
                          { name: 'Compliant', value: compliantCount, fill: 'url(#colorCompliant)' },
                          { name: 'Resolved', value: resolvedCount, fill: 'url(#colorResolved)' },
                          { name: 'Pending', value: pendingCount, fill: 'url(#colorPending)' },
                          { name: 'Overdue', value: overdueCount, fill: 'url(#colorOverdue)' },
                          { name: 'Non-Compliant', value: nonCompliantCount, fill: 'url(#colorNonCompliant)' }
                        ];

                        // Penalty Matrix Candlestick Data
                        const penaltyCandleData = [
                          { name: 'Low (Conduct)', min: 2000, max: 10000, body: [5000, 8000], label: '₹2K - ₹10K' },
                          { name: 'Medium (Reports)', min: 10000, max: 50000, body: [20000, 40000], label: '₹10K - ₹50K' },
                          { name: 'High (KUA/Pan)', min: 50000, max: 200000, body: [80000, 150000], label: '₹50K - ₹200K' },
                          { name: 'Critical (Defaults)', min: 200000, max: 1000000, body: [350000, 800000], label: '₹200K - ₹1M' }
                        ];

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Compliance Health Overview */}
                            <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                <div>
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">SEBI Compliance Registry Health</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Real-time status distribution of active regulatory requirements</p>
                                </div>
                                <button onClick={handleComplianceSweep} disabled={sweepLoading} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 flex items-center space-x-1.5 disabled:opacity-50">
                                  {sweepLoading ? <Loader2 className="h-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                  <span>Sweep Audits</span>
                                </button>
                              </div>

                              <div className="h-[220px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={complianceChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                                      </linearGradient>
                                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0.2} />
                                      </linearGradient>
                                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                                      </linearGradient>
                                      <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                                      </linearGradient>
                                      <linearGradient id="colorNonCompliant" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="grid grid-cols-5 gap-2 pt-2 text-center border-t border-slate-300 dark:border-white/5">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">✅ Compliant</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{compliantCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold block">Paid</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{resolvedCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Pending</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{pendingCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold block">Overdue</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{overdueCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block">Levied</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{nonCompliantCount}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Sales & Client Growth Analytics */}
                            <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-300 dark:border-white/5">
                                <div>
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Sales & Client Growth</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Track advisory revenue and user onboarding progress</p>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center space-x-2">
                                  {/* Metric Selector */}
                                  <select
                                    value={dashboardMetric}
                                    onChange={e => setDashboardMetric(e.target.value as any)}
                                    className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-1 px-2.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-500"
                                  >
                                    <option value="sales">💰 Sales Revenue</option>
                                    <option value="clients">👥 Client Growth</option>
                                  </select>

                                  {/* Timeframe Selector */}
                                  <div className="flex bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setDashboardTimeframe('monthly')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${dashboardTimeframe === 'monthly' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                                    >
                                      Month
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDashboardTimeframe('yearly')}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${dashboardTimeframe === 'yearly' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                                    >
                                      Year
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="h-[220px] w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={salesAndClientChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                      </linearGradient>
                                      <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickLine={false} />
                                    <YAxis
                                      stroke="#64748b"
                                      fontSize={10}
                                      tickLine={false}
                                      tickFormatter={(v) => dashboardMetric === 'sales' ? `₹${(v / 1000).toLocaleString()}K` : v}
                                    />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                                      formatter={(value: any) => [
                                        dashboardMetric === 'sales' ? `₹${value.toLocaleString()}` : `${value} Clients`,
                                        dashboardMetric === 'sales' ? 'Revenue' : 'New Onboards'
                                      ]}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="value"
                                      stroke={dashboardMetric === 'sales' ? '#8b5cf6' : '#06b6d4'}
                                      strokeWidth={2}
                                      fill={dashboardMetric === 'sales' ? 'url(#colorSales)' : 'url(#colorClients)'}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Summary Footer */}
                              <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-300 dark:border-white/5 font-medium">
                                <span>
                                  Total {dashboardMetric === 'sales' ? 'Revenue' : 'Clients'}:{' '}
                                  <strong className="text-slate-900 dark:text-white">
                                    {dashboardMetric === 'sales'
                                      ? `₹${salesAndClientChartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}`
                                      : `${salesAndClientChartData.reduce((acc, curr) => acc + curr.value, 0)}`}
                                  </strong>
                                </span>
                                <span>
                                  Current {dashboardTimeframe === 'monthly' ? 'Month' : 'Year'}:{' '}
                                  <strong className={dashboardMetric === 'sales' ? 'text-purple-600 dark:text-purple-400' : 'text-cyan-600 dark:text-cyan-400'}>
                                    {salesAndClientChartData.length > 0
                                      ? dashboardMetric === 'sales'
                                        ? `₹${salesAndClientChartData[salesAndClientChartData.length - 1].value.toLocaleString()}`
                                        : `${salesAndClientChartData[salesAndClientChartData.length - 1].value} Onboarded`
                                      : '—'}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Closing Alert Modal removed from dashboard tab block */}

                      {/* Bulk Exports Section */}
                      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div className="mt-8 glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Download className="w-5 h-5 text-indigo-500" />
                                Bulk Data Exports
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Download complete records for compliance and record-keeping.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-300 dark:border-white/5">
                              <select
                                value={exportRange}
                                onChange={(e) => setExportRange(e.target.value as 'all' | 'date')}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                              >
                                <option value="all">All Time</option>
                                <option value="date">Date Range</option>
                              </select>

                              {exportRange === 'date' && (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="date"
                                    value={exportStartDate}
                                    onChange={(e) => setExportStartDate(e.target.value)}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none"
                                  />
                                  <span className="text-slate-500 text-xs">to</span>
                                  <input
                                    type="date"
                                    value={exportEndDate}
                                    onChange={(e) => setExportEndDate(e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <button onClick={() => handleBulkExport('invoices', true)} disabled={exportLoading === 'invoices'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-indigo-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">All Client Invoices (ZIP)</span></div>
                              {exportLoading === 'invoices' ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />}
                            </button>

                            <button onClick={() => handleBulkExport('agreements', true)} disabled={exportLoading === 'agreements'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><FileCheck className="w-4 h-4 text-emerald-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">All Client Agreements (ZIP)</span></div>
                              {exportLoading === 'agreements' ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />}
                            </button>

                            <button onClick={() => handleBulkExport('kra', true)} disabled={exportLoading === 'kra'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><Database className="w-4 h-4 text-blue-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">All KRA Documents (ZIP)</span></div>
                              {exportLoading === 'kra' ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />}
                            </button>

                            <button onClick={() => handleBulkExport('clients', false)} disabled={exportLoading === 'clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">All Clients List</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'clients' ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />}
                            </button>

                            <button onClick={() => handleBulkExport('deleted-clients', false)} disabled={exportLoading === 'deleted-clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">Deleted Clients</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'deleted-clients' ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />}
                            </button>

                            <button onClick={() => handleBulkExport('payments', false)} disabled={exportLoading === 'payments'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">Payments Report</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'payments' ? <Loader2 className="w-5 h-5 animate-spin text-teal-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />}
                            </button>

                            <button onClick={() => handleBulkExport('research-reports', true)} disabled={exportLoading === 'research-reports'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">All Research Reports</div>
                                <div className="text-[10px] text-slate-500 mt-1">PDF Zip Archive</div>
                              </div>
                              {exportLoading === 'research-reports' ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Active Client Summary Button */}
                      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between shadow-sm">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              Active Client Summary
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              View daily historical active client counts and download detailed reports.
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('activeClientSummary')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                          >
                            View Summary <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'activeClientSummary' && (
                    <ActiveClientSummary />
                  )}

                  {/* STAFF MANAGEMENT TAB */}
                  {activeTab === 'staff' && (
                    <div className="space-y-6">
                      {/* Header with "+ Register Staff" button */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Staff Directory</h3>
                        <div className="flex gap-3">
                          {(!isStaff || hasPermission('EXPORT_DATA')) && (
                            <button
                              onClick={() => import('@/utils/exportCsv').then(m => m.downloadCSV(staff, 'Staff_Members'))}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition"
                            >
                              <Download className="w-4 h-4" /> Export CSV
                            </button>
                          )}
                          <button
                            onClick={() => {
                              resetStaffForm();
                              setIsStaffModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs uppercase tracking-wide transition flex items-center space-x-2 text-white"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Register Staff</span>
                          </button>
                        </div>
                      </div>

                      {/* Staff directory table */}
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden w-full shadow-xl shadow-slate-200/20 dark:shadow-none bg-white dark:bg-[#0F172A]">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">S.No</th>
                                <th className="py-4 px-6 font-semibold">Registered On</th>
                                <th className="py-4 px-6 font-semibold">Staff Member</th>
                                <th className="py-4 px-6 font-semibold">SEBI System Role</th>
                                <th className="py-4 px-6 font-semibold">NISM Validity</th>
                                <th className="py-4 px-6 font-semibold">Status</th>
                                <th className="py-4 px-6 text-right font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <PaginatedList data={staff} itemsPerPage={10}>
                              {(pageData) => (
                                <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300 font-medium">
                                  {pageData.map((st: any, index: number) => {
                                    const isDeleted = st.user?.deletedAt !== null;
                                    return (
                                      <tr
                                        key={st.id}
                                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors duration-200 ${isDeleted ? 'opacity-50 bg-slate-50 dark:bg-slate-900/20' : 'bg-white dark:bg-transparent'}`}
                                      >
                                        <td className="py-4 px-6">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                            {index + 1}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                          {st.user?.createdAt ? (
                                            <span className="block">
                                              {new Date(st.user.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                          ) : (
                                            <span className="text-slate-600 block">N/A</span>
                                          )}
                                        </td>
                                        <td className="py-4 px-6">
                                          <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-2">
                                            {st.name}
                                            {isDeleted && (
                                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                DELETED
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-500 block">{st.email}</span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-500 block">{st.mobile}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                          <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[9px] border border-primary-500/20 font-bold uppercase tracking-wider font-mono">
                                            {st.user?.role?.name || 'N/A'}
                                          </span>
                                          {st.personAssociated && (
                                            <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1 font-mono">
                                              ({st.personAssociated.roleType === 'OTHER' ? st.personAssociated.customRole : st.personAssociated.roleType})
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-400">
                                          {st.nismValidity ? (
                                            <span className="block">
                                              {new Date(st.nismValidity).toDateString()}
                                            </span>
                                          ) : (
                                            <span className="text-slate-600 block">N/A</span>
                                          )}
                                          {st.nismNumber && (
                                            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono block">
                                              No: {st.nismNumber}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-4 px-6">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${st.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                                            {st.status}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                          <button
                                            onClick={() => setSelectedStaff(st)}
                                            title="View Details"
                                            className="p-1.5 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition inline-flex items-center"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                          </button>

                                          {!isDeleted && (
                                            <>
                                              <button
                                                onClick={() => startEditStaff(st)}
                                                title="Edit Profile"
                                                className="p-1.5 rounded-lg border border-primary-500/10 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 transition inline-flex items-center"
                                              >
                                                <Edit2 className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleToggleStaffStatus(st.id)}
                                                title={st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${st.status === 'ACTIVE' ? 'border border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' : 'border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                                              >
                                                {st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                              </button>
                                              <button
                                                onClick={() => handleDeleteStaff(st.id)}
                                                title="Delete Staff"
                                                className="p-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 transition inline-flex items-center"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </>
                                          )}

                                          {isDeleted && (
                                            <button
                                              onClick={() => handleRestoreStaff(st.id)}
                                              title="Restore Staff"
                                              className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center"
                                            >
                                              <RotateCcw className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {pageData.length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-500">
                                        No staff members registered.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              )}
                            </PaginatedList>
                          </table>
                        </div>
                      </div>

                      {/* Register/Edit Staff Modal Popup */}
                      {isStaffModalOpen && (
                        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
                            <button
                              onClick={() => {
                                setIsStaffModalOpen(false);
                                resetStaffForm();
                              }}
                              className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                            >
                              <X className="h-5 w-5" />
                            </button>

                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                              {editingStaff ? 'Edit Staff Member' : 'Register Staff Member'}
                            </h3>


                            <form onSubmit={handleCreateOrUpdateStaff} className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
                                  <input
                                    type="text"
                                    required
                                    value={staffName}
                                    onChange={e => setStaffName(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"
                                    placeholder="Amit Sharma"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Email Address</label>
                                  <input
                                    type="email"
                                    required
                                    disabled={!!editingStaff}
                                    value={staffEmail}
                                    onChange={e => setStaffEmail(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs disabled:opacity-50"
                                    placeholder="amit@company.com"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Mobile Number</label>
                                  <input
                                    type="text"
                                    required
                                    value={staffMobile}
                                    onChange={e => setStaffMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"
                                    placeholder="9811223344"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Assign Role</label>
                                  {editingStaff ? (
                                    <input
                                      type="text"
                                      readOnly
                                      value={staffRole.replace(/_/g, ' ')}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono uppercase text-slate-600 dark:text-slate-400 cursor-not-allowed"
                                    />
                                  ) : (
                                    <select
                                      value={staffRole}
                                      onChange={e => setStaffRole(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono uppercase"
                                    >
                                      {roles.length > 0 ? (
                                        <>
                                          {roles.filter(r => !['SUPER_ADMIN', 'CLIENT', 'ADMIN'].includes(r.name)).map((r: any) => (
                                            <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>
                                          ))}
                                          <option value="OTHER">OTHER</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="RESEARCHER">RESEARCHER</option>
                                          <option value="PRINCIPAL_OFFICER">PRINCIPAL OFFICER</option>
                                          <option value="COMPLIANCE_OFFICER">COMPLIANCE OFFICER</option>
                                          <option value="PERSON_ASSOCIATED">PERSON ASSOCIATED WITH RESEARCH</option>
                                          <option value="OTHER">OTHER</option>
                                        </>
                                      )}
                                    </select>
                                  )}
                                </div>
                              </div>

                              {staffRole === 'PERSON_ASSOCIATED' && (
                                <div className="space-y-3 bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                  <div>
                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Associated Type</label>
                                    <select
                                      value={associatedType}
                                      onChange={e => setAssociatedType(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"
                                    >
                                      <option value="SALES">SALES</option>
                                      <option value="MARKETING">MARKETING</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {staffRole === 'OTHER' && (
                                <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Custom Role Name</label>
                                  <input
                                    type="text"
                                    required
                                    value={customAssociatedRole}
                                    onChange={e => setCustomAssociatedRole(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"
                                    placeholder="e.g. Technical Support"
                                  />
                                </div>
                              )}

                              <div className="border-t border-slate-300 dark:border-white/5 pt-3 space-y-4">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">NISM Certification (If applicable)</span>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Certificate No</label>
                                    <input
                                      type="text"
                                      value={staffNism}
                                      onChange={e => setStaffNism(e.target.value)}
                                      className={`w-full bg-slate-100 dark:bg-slate-950 border rounded-xl py-2 px-3 text-xs ${isNismDuplicate ? 'border-red-500 text-red-200' : 'border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                        }`}
                                      placeholder="NISM-8899"
                                    />
                                    {isNismDuplicate && (
                                      <span className="text-red-600 dark:text-red-500 text-[10px] mt-1 block">
                                        Duplicate NISM Certificate Number. Please enter a unique number.
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Validity Expiry</label>
                                    <input
                                      type="date"
                                      value={staffNismValidity}
                                      onChange={e => setStaffNismValidity(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-600 dark:text-slate-400"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Upload NISM Certificate Document <span className="text-slate-500 dark:text-slate-500">(PDF auto-fills details)</span></label>
                                  <div className={`border border-dashed rounded-xl p-4 text-center transition relative ${isParsingStaffNism ? 'border-amber-500/30 bg-amber-500/5' : staffNismParsed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10'}`}>
                                    <input
                                      type="file"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      onChange={handleStaffNismFileChange}
                                      disabled={isParsingStaffNism}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    {isParsingStaffNism ? (
                                      <>
                                        <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                                        <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Reading NISM certificate...</span>
                                      </>
                                    ) : staffNismParsed ? (
                                      <>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">✅ Auto-filled from PDF</span>
                                        <span className="text-[9px] text-slate-600 dark:text-slate-400 block">{staffNismFile?.name}</span>
                                      </>
                                    ) : staffNismFile ? (
                                      <>
                                        <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                                        <span className="text-[10px] text-blue-700 dark:text-blue-300 block">{staffNismFile.name}</span>
                                        <span className="text-[9px] text-slate-600 dark:text-slate-400 block">Please fill in details manually</span>
                                      </>
                                    ) : (
                                      <>
                                        <UploadCloud className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                                        <span className="text-[10px] text-slate-700 dark:text-slate-300 block">
                                          Upload certificate PDF for auto-fill (or JPG/PNG)
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {nismParseMsg && (
                                    <p className={`text-[10px] mt-1 ${nismParseMsg.startsWith('✅') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                      {nismParseMsg}
                                    </p>
                                  )}
                                  {editingStaff?.nismUpload && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex justify-between items-center">
                                      <span>Current certificate:</span>
                                      <a
                                        href={`${api.getBaseUrl()}${editingStaff.nismUpload}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline hover:text-emerald-700 dark:text-emerald-300 font-bold"
                                      >
                                        View Certificate File
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex space-x-3 pt-2 justify-end text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsStaffModalOpen(false);
                                    resetStaffForm();
                                  }}
                                  className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={isNismDuplicate || isParsingStaffNism || isSubmittingStaff}
                                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition flex items-center space-x-2"
                                >
                                  {(isParsingStaffNism || isSubmittingStaff) && <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                  <span>{isSubmittingStaff ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Register Staff')}</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Staff Credentials Popup - Shows only ID & Password after registration */}
                      {showStaffCredsPopup && createdStaffCreds && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 space-y-6 relative shadow-2xl shadow-emerald-500/10">
                            {/* Glow effect */}
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                            {/* Header */}
                            <div className="text-center space-y-2">
                              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <h3 className="text-xl font-black text-slate-900 dark:text-white">Staff Registered!</h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400">Save these login credentials. They won't be shown again.</p>
                            </div>

                            {/* Credentials */}
                            <div className="space-y-3">
                              <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-400 dark:border-white/10 rounded-xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Login ID (Email)</span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300 font-bold break-all">{createdStaffCreds?.staff?.email || createdStaffCreds?.email || '—'}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(createdStaffCreds?.staff?.email || createdStaffCreds?.email || '')}
                                    className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition font-semibold"
                                  >Copy</button>
                                </div>
                              </div>

                              <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-400 dark:border-white/10 rounded-xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Password</span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm text-amber-700 dark:text-amber-300 font-bold tracking-widest">{createdStaffCreds?.generatedPassword || '—'}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(createdStaffCreds?.generatedPassword || '')}
                                    className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition font-semibold"
                                  >Copy</button>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-center text-slate-500 dark:text-slate-500">
                              ⚠️ Share these credentials with the staff member securely.
                            </p>

                            <button
                              onClick={() => {
                                setShowStaffCredsPopup(false);
                                setCreatedStaffCreds(null);
                              }}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm"
                            >
                              Done — Credentials Saved
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Complete Detail View Modal Popup */}
                      {selectedStaff && (
                        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
                            <button
                              onClick={() => setSelectedStaff(null)}
                              className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                            >
                              <X className="h-5 w-5" />
                            </button>

                            <div>
                              <h3 className="font-bold text-base text-slate-900 dark:text-white">Staff Member Details</h3>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">ID: {selectedStaff.employeeId}</p>
                            </div>

                            <div className="space-y-4">
                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Full Name</span>
                                  <span className="font-bold text-slate-900 dark:text-white">{selectedStaff.name}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Email Address</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.email}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Mobile Number</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.mobile}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">SEBI System Role</span>
                                  <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 font-mono font-bold uppercase tracking-wider text-[9px]">
                                    {selectedStaff.user?.role?.name || 'N/A'}
                                  </span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Registered On</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {selectedStaff.user?.createdAt ? new Date(selectedStaff.user.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                  </span>
                                </div>

                                {selectedStaff.personAssociated && (
                                  <>
                                    <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                      <span className="text-slate-600 dark:text-slate-400">Associated Type</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.personAssociated.roleType}</span>
                                    </div>
                                    {selectedStaff.personAssociated.roleType === 'OTHER' && (
                                      <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                        <span className="text-slate-600 dark:text-slate-400">Custom Role Name</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.personAssociated.customRole}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">NISM Certification</span>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Certificate No</span>
                                  <span className="font-bold text-slate-900 dark:text-white">{selectedStaff.nismNumber || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Validity Expiry</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {selectedStaff.nismValidity ? new Date(selectedStaff.nismValidity).toDateString() : 'N/A'}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center pt-1">
                                  <span className="text-slate-600 dark:text-slate-400">Certificate File</span>
                                  {selectedStaff.nismUpload ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const fileUrl = `${api.getBaseUrl()}${selectedStaff.nismUpload}`;
                                        const fileName = selectedStaff.nismUpload.split('/').pop() || 'nism_certificate';
                                        downloadFile(fileUrl, fileName);
                                      }}
                                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                                    >
                                      Download File
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 dark:text-slate-500 font-bold">No file uploaded</span>
                                  )}
                                </div>
                              </div>

                              {selectedStaff.nismUpload && (
                                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                  <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Certificate Preview</span>

                                  <div className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 flex items-center justify-center overflow-hidden min-h-[160px]">
                                    {selectedStaff.nismUpload.toLowerCase().endsWith('.pdf') ? (
                                      <iframe
                                        src={`${api.getBaseUrl()}${selectedStaff.nismUpload}`}
                                        className="w-full h-48 border-0 bg-white"
                                        title="NISM Certificate PDF"
                                      />
                                    ) : (selectedStaff.nismUpload.toLowerCase().endsWith('.png') ||
                                      selectedStaff.nismUpload.toLowerCase().endsWith('.jpg') ||
                                      selectedStaff.nismUpload.toLowerCase().endsWith('.jpeg')) ? (
                                      <img
                                        src={`${api.getBaseUrl()}${selectedStaff.nismUpload}`}
                                        alt="NISM Certificate"
                                        className="max-w-full max-h-48 object-contain"
                                      />
                                    ) : (
                                      <span className="text-slate-500 dark:text-slate-500 font-bold">Preview not available</span>
                                    )}
                                  </div>

                                  <div className="flex gap-3 justify-end pt-1">
                                    <a
                                      href={`${api.getBaseUrl()}${selectedStaff.nismUpload}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Open Full
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const fileUrl = `${api.getBaseUrl()}${selectedStaff.nismUpload}`;
                                        const fileName = selectedStaff.nismUpload.split('/').pop() || 'nism_certificate';
                                        downloadFile(fileUrl, fileName);
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                      <UploadCloud className="h-3 w-3 rotate-180" />
                                      Download File
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">System Status</span>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Staff Status</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${selectedStaff.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                                    {selectedStaff.status}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Account Access</span>
                                  {selectedStaff.user?.deletedAt ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                      DELETED (SOFT)
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      ACTIVE MEMBER
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-3 pt-2 justify-end text-xs">
                              {selectedStaff.user?.deletedAt === null && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStaff(null);
                                    startEditStaff(selectedStaff);
                                  }}
                                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-white transition"
                                >
                                  Edit Profile
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedStaff(null)}
                                className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5"
                              >
                                Close Details
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAYMENTS TAB (RESTORED) */}
                  {activeTab === 'payments' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-slate-300 dark:border-white/5 pb-4">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">Payment History Desk</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">View all successful client payments and subscriptions.</p>
                        </div>
                        {(!isStaff || hasPermission('EXPORT_DATA')) && (
                          <button
                            onClick={() => {
                              const exportData = allPayments.map(p => ({
                                Payment_ID: p.id,
                                Client: p.client?.name || 'Unknown',
                                Date: new Date(p.createdAt).toLocaleDateString(),
                                Amount: p.amount,
                                Plan: p.plan?.name || 'Unknown',
                                Transaction_Ref: p.transactionRef,
                                Status: 'SUCCESS'
                              }));
                              import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'Admin_Payments'));
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition"
                          >
                            Export CSV
                          </button>
                        )}
                      </div>

                      <div className="glassmorphism p-1 rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                              <tr className="bg-white dark:bg-slate-900/50 border-b border-slate-400 dark:border-white/10 text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                                <th className="py-4 px-6 w-[15%]">Payment Date</th>
                                <th className="py-4 px-6 w-[25%]">Client Details</th>
                                <th className="py-4 px-6 w-[15%]">Plan</th>
                                <th className="py-4 px-6 w-[15%]">Amount</th>
                                <th className="py-4 px-6 w-[15%]">Payment Info</th>
                                <th className="py-4 px-6 w-[10%]">Receipt</th>
                                <th className="py-4 px-6 w-[5%] text-right">Status</th>
                              </tr>
                            </thead>
                            <PaginatedList data={allPayments} itemsPerPage={10}>
                              {(pageData) => (
                                <tbody className="divide-y divide-slate-300 dark:divide-white/5 font-medium">
                                  {pageData.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition group">
                                      <td className="py-4 px-6">
                                        <div className="text-slate-700 dark:text-slate-300 font-mono text-xs">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}</div>
                                      </td>
                                      <td className="py-4 px-6 text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-1"><span className="text-slate-500">EMAIL:</span> {p.client?.user?.email || 'N/A'}</div>
                                        <div className="flex items-center gap-1"><span className="text-slate-500">MOB:</span> {p.client?.user?.mobile || 'N/A'}</div>
                                        <div className="flex items-center gap-1"><span className="text-slate-500">PAN:</span> {p.client?.pan || 'N/A'}</div>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">{p.plan?.name || 'Custom'}</span>
                                          {(p.paymentMode === 'CUSTOM_PRO_RATA' || p.remarks?.includes('[PRO-RATA]')) && (
                                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 font-semibold">INR {p.amount}</td>
                                      <td className="py-4 px-6">
                                        <span className="block text-[10px] text-slate-600 dark:text-slate-400">{p.paymentMode}</span>
                                        <span className="font-mono text-slate-500 text-[10px]">{p.transactionRef}</span>
                                      </td>
                                      <td className="py-4 px-6 text-slate-600 dark:text-slate-400 space-y-1">
                                        <div>
                                          <button
                                            onClick={() => {
                                              import('@/services/api').then(m => m.default.downloadInvoicePdf(p.id, `Invoice_${p.transactionRef}.pdf`)).catch(() => toast.error('Failed to download invoice'));
                                            }}
                                            className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded font-bold transition inline-flex items-center gap-1 border border-slate-300 dark:border-white/10 shadow-sm"
                                          >
                                            Download Invoice
                                          </button>
                                        </div>
                                        {p.receiptUrl && (
                                          <div className="text-[10px] pt-1">
                                            <span className="text-slate-500">Receipt:</span> <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="underline text-primary-600 font-bold hover:text-primary-700">View</a>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 px-6 text-right">
                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase">Success</span>
                                      </td>
                                    </tr>
                                  ))}
                                  {pageData.length === 0 && (
                                    <tr>
                                      <td colSpan={7} className="text-center py-8 text-slate-500">No payment history available.</td>
                                    </tr>
                                  )}
                                </tbody>
                              )}
                            </PaginatedList>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEBI CHECKLIST TAB */}
                  {activeTab === 'checklist' && (() => {
                    // These serial numbers are auto-monitored by the system
                    // Alerts + penalties fire automatically when breached
                    const AUTO_MONITORED_SERIALS = [4, 5, 6, 12, 17, 48];
                    const manualChecklist = checklist.filter((item: any) => !AUTO_MONITORED_SERIALS.includes(item.serialNo));
                    let activeList = manualChecklist.filter(
                      (item: any) => !item.audit || item.audit.status === 'PENDING' || item.audit.status === 'OVERDUE' || item.audit.status === 'NON_COMPLIANT'
                    );

                    if (checklistStatusFilter === 'OVERDUE') {
                      activeList = activeList.filter((item: any) => item.audit?.status === 'OVERDUE' || item.audit?.status === 'NON_COMPLIANT' || (item.currentPeriod?.dueDate && new Date(item.currentPeriod.dueDate).getTime() < Date.now()));
                    } else if (checklistStatusFilter === 'PENDING') {
                      activeList = activeList.filter((item: any) => (!item.audit || item.audit.status === 'PENDING') && !(item.currentPeriod?.dueDate && new Date(item.currentPeriod.dueDate).getTime() < Date.now()));
                    }

                    const now = Date.now();
                    const oneMonth = 30 * 24 * 60 * 60 * 1000;
                    activeList.sort((a: any, b: any) => {
                      const aDate = a.currentPeriod?.dueDate ? new Date(a.currentPeriod.dueDate).getTime() : Infinity;
                      const bDate = b.currentPeriod?.dueDate ? new Date(b.currentPeriod.dueDate).getTime() : Infinity;
                      const aRequiresAction = aDate - now <= oneMonth || !a.currentPeriod?.dueDate;
                      const bRequiresAction = bDate - now <= oneMonth || !b.currentPeriod?.dueDate;
                      if (aRequiresAction && !bRequiresAction) return -1;
                      if (!aRequiresAction && bRequiresAction) return 1;
                      return aDate - bDate;
                    });

                    return (
                      <div className={`w-full ${showMobilePreview ? 'lg:flex items-start' : ''}`}>
                        <div className="flex-1 space-y-6 lg:pr-6">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-lg font-bold text-slate-900 dark:text-white">SEBI Checklist</h2>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Manage and track your compliance checklist</p>
                            </div>
                            <div className="flex space-x-2">
                              <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Preview</span>
                                <div className="relative">
                                  <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
                                  <div className="w-8 h-4 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                                </div>
                              </label>
                            </div>
                          </div>

                          {/* Info banner about auto-monitored items */}
                          <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-500/5 border border-primary-500/20">
                            <div className="p-2 bg-primary-500/10 rounded-xl shrink-0 mt-0.5">
                              <ShieldCheck className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary-700 dark:text-primary-300">Auto-Monitored Items Excluded</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                The following are <span className="text-slate-900 dark:text-white font-semibold">auto-tracked by the system</span> — alerts &amp; penalties fire automatically when conditions are breached. View them under the <span className="text-primary-700 dark:text-primary-300 font-bold">Automated Alerts</span> tab:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {[
                                  { no: 4, label: 'NISM Certification Expiry' },
                                  { no: 5, label: 'SEBI Certificate Renewal' },
                                  { no: 6, label: 'Net Worth / Deposit Threshold' },
                                  { no: 12, label: 'Part-Time RA Client Limit' },
                                  { no: 17, label: 'SEBI Fee Cap Rs.1,51,000/client/FY' },
                                  { no: 48, label: 'PAN Collection (Active + KYC done)' },
                                ].map(a => (
                                  <span key={a.no} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-700 dark:text-primary-300 font-semibold">
                                    <span className="bg-primary-500/20 rounded px-1 font-mono">SR.{a.no}</span>
                                    {a.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Sub-tab selection */}
                          <div className="flex space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                            <button
                              onClick={() => setChecklistSubTab('active')}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${checklistSubTab === 'active' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}
                            >
                              Active Checklist ({activeList.length})
                            </button>
                            <button
                              onClick={() => setChecklistSubTab('history')}
                              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${checklistSubTab === 'history' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}
                            >
                              Checklist History ({checklistHistory.length})
                            </button>
                          </div>

                          {/* ACTIVE CHECKLIST VIEW */}
                          {checklistSubTab === 'active' && (
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <button onClick={() => setChecklistStatusFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'ALL' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>All Tasks</button>
                                <button onClick={() => setChecklistStatusFilter('PENDING')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'PENDING' ? 'bg-amber-600 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>Pending</button>
                                <button onClick={() => setChecklistStatusFilter('OVERDUE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'OVERDUE' ? 'bg-rose-600 text-slate-900 dark:text-white ' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>Non-Compliant</button>
                              </div>
                              <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                  <PaginatedList data={activeList} itemsPerPage={10}>
                                    {(pageData) => (
                                      <>
                                        <table className="w-full text-left">
                                          <thead>
                                            <tr className="border-b border-slate-400 dark:border-white/10 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                              <th className="py-3 px-4">Sr.</th>
                                              <th className="py-3 px-4">Requirement</th>
                                              <th className="py-3 px-4">Frequency / Next Check</th>
                                              <th className="py-3 px-4">Priority</th>
                                              <th className="py-3 px-4">Penalty</th>
                                              <th className="py-3 px-4">Status</th>
                                              {user.role === 'COMPLIANCE_OFFICER' && <th className="py-3 px-4 text-center">Action</th>}
                                            </tr>
                                          </thead>
                                          <tbody className="text-xs divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                            {pageData.map((item: any) => {
                                              const status = item.audit?.status || 'PENDING';
                                              const colors: Record<string, string> = {
                                                COMPLIANT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                                                NON_COMPLIANT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                                                PENDING: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                                                OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                                                PENALTY_RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                                                PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                              };
                                              const dueDateMs = item.currentPeriod?.dueDate ? new Date(item.currentPeriod.dueDate).getTime() : null;
                                              const daysLeft = dueDateMs ? Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24)) : null;
                                              const requiresAction = daysLeft === null || daysLeft <= 30;

                                              let dateColorClass = 'text-slate-600 dark:text-slate-400';
                                              if (daysLeft !== null) {
                                                if (daysLeft < 0) dateColorClass = 'text-red-600 dark:text-red-500 font-bold';
                                                else if (daysLeft <= 7) dateColorClass = 'text-rose-600 dark:text-rose-400 font-bold';
                                                else if (daysLeft <= 30) dateColorClass = 'text-orange-600 dark:text-orange-400 font-bold';
                                                else dateColorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
                                              }

                                              const dueDateText = item.currentPeriod?.dueDate
                                                ? new Date(item.currentPeriod.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : 'Ongoing';

                                              return (
                                                <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                                  <td className="py-3 px-4 text-slate-500 dark:text-slate-500">{item.serialNo}</td>
                                                  <td className="py-3 px-4 font-medium max-w-xs">{item.requirement}</td>
                                                  <td className="py-3 px-4">
                                                    <span className="block font-medium">{item.frequency}</span>
                                                    <span className={`block text-[10px] mt-0.5 ${dateColorClass}`}>Due: {dueDateText}</span>
                                                  </td>
                                                  <td className="py-3 px-4">
                                                    {item.severityLevel === 'HIGH' && (
                                                      <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.4)]">High</span>
                                                    )}
                                                    {(item.severityLevel === 'MODERATE' || item.severityLevel === 'MEDIUM') && (
                                                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Moderate</span>
                                                    )}
                                                    {item.severityLevel === 'LOW' && (
                                                      <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Low</span>
                                                    )}
                                                    {!item.severityLevel && <span className="text-slate-500 dark:text-slate-500">—</span>}
                                                  </td>
                                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[180px]">{item.penaltyAmount || '—'}</td>
                                                  <td className="py-3 px-4">
                                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${colors[status] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>{status.replace('_', ' ')}</span>
                                                  </td>
                                                  {user.role === 'COMPLIANCE_OFFICER' && (
                                                    <td className="py-3 px-4 text-center">
                                                      {requiresAction && (
                                                        <button onClick={() => { setAuditModalReq(item); setAuditStatus(status !== 'PENDING' ? status : ''); setAuditRemarks(item.audit?.officerRemarks || ''); }} className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] rounded-lg text-[10px] font-bold transition">Update</button>
                                                      )}
                                                    </td>
                                                  )}
                                                </tr>
                                              );
                                            })}
                                            {activeList.length === 0 && checklist.length > 0 && (
                                              <tr>
                                                <td colSpan={7} className="text-center py-12 text-slate-600 dark:text-slate-400">
                                                  <div className="flex flex-col items-center justify-center space-y-2">
                                                    <CheckSquare className="h-10 w-10 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">🎉 All compliance tasks completed!</p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400">There are no pending manual compliance tasks for the current period.</p>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                            {checklist.length === 0 && loading && (
                                              <tr>
                                                <td colSpan={7} className="text-center py-12">
                                                  <div className="flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                                                    <p className="font-medium text-sm animate-pulse">Loading compliance checklist...</p>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                            {checklist.length === 0 && !loading && (
                                              <tr>
                                                <td colSpan={7} className="text-center py-12">
                                                  <div className="flex flex-col items-center justify-center space-y-4">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">No checklist items found for this period.</p>
                                                    <button onClick={() => loadData(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm hover:shadow">
                                                      <RefreshCw className="w-4 h-4" />
                                                      <span>Reload Checklist</span>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </>
                                    )}
                                  </PaginatedList>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CHECKLIST HISTORY VIEW */}
                          {checklistSubTab === 'history' && (() => {


                            return (
                              <div className="space-y-4">
                                {/* History Search/Filter Bar */}
                                <div className="flex items-center space-x-3 w-full max-w-2xl">
                                  <div className="flex flex-1 items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-400 dark:border-white/10">
                                    <input
                                      type="text"
                                      placeholder="Filter history by requirement description..."
                                      value={historyFilterText}
                                      onChange={(e) => setHistoryFilterText(e.target.value)}
                                      className="bg-transparent border-0 text-slate-900 dark:text-white text-xs py-2 w-full focus:ring-0 focus:outline-none"
                                    />
                                    {historyFilterText && (
                                      <button onClick={() => setHistoryFilterText('')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white text-xs">Clear</button>
                                    )}
                                  </div>
                                  <select
                                    value={selectedFinancialYear}
                                    onChange={(e) => setSelectedFinancialYear(e.target.value)}
                                    className="bg-slate-100 dark:bg-slate-800/50 border border-slate-400 dark:border-white/10 text-slate-900 dark:text-white text-xs py-2 px-3 rounded-xl focus:ring-0 focus:outline-none"
                                  >
                                    <option value="All">All Financial Years</option>
                                    {availableFinancialYears.map(fy => (
                                      <option key={fy as string} value={fy as string}>{fy as string}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="border-b border-slate-400 dark:border-white/10 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                        <th className="py-3 px-4">Sr.</th>
                                        <th className="py-3 px-4">Requirement</th>
                                        <th className="py-3 px-4">Period</th>
                                        <th className="py-3 px-4">Change Log</th>
                                        <th className="py-3 px-4">Remarks</th>
                                        <th className="py-3 px-4">Proof</th>
                                        <th className="py-3 px-4">Updated By</th>
                                        <th className="py-3 px-4">Date</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-xs divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                      {(() => {
                                        const pageData = historyPagination.currentData;

                                        if (pageData.length === 0) {
                                          return (
                                            <tr>
                                              <td colSpan={8} className="text-center py-10 text-slate-500 dark:text-slate-500">
                                                {historyFilterText ? 'No matching history records found.' : 'No audit history records yet.'}
                                              </td>
                                            </tr>
                                          );
                                        }

                                        return pageData.map((h: any) => {
                                          const prevStatus = h.previousStatus || 'PENDING';
                                          const newStatus = h.newStatus;

                                          const colors: Record<string, string> = {
                                            COMPLIANT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                                            NON_COMPLIANT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                                            PENDING: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                                            OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                                            PENALTY_RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                                            PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                          };

                                          return (
                                            <tr key={h.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                              <td className="py-3 px-4 text-slate-500 dark:text-slate-500">{h.requirement?.serialNo}</td>
                                              <td className="py-3 px-4 font-medium max-w-xs">{h.requirement?.requirement}</td>
                                              <td className="py-3 px-4 font-semibold text-primary-700 dark:text-primary-300">{h.periodLabel || '—'}</td>
                                              <td className="py-3 px-4">
                                                <div className="flex items-center space-x-1">
                                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase ${colors[prevStatus] || 'bg-slate-500/10'}`}>{prevStatus.replace('_', ' ')}</span>
                                                  <span className="text-slate-500 dark:text-slate-500">→</span>
                                                  <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase ${colors[newStatus] || 'bg-slate-500/10'}`}>{newStatus.replace('_', ' ')}</span>
                                                </div>
                                              </td>
                                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={h.officerRemarks}>{h.officerRemarks || '—'}</td>
                                              <td className="py-3 px-4">
                                                {h.proofDocumentUrl ? (
                                                  <button
                                                    onClick={() => window.open(api.getBaseUrl() + '' + h.proofDocumentUrl, '_blank')}
                                                    className="text-emerald-600 dark:text-emerald-400 hover:text-slate-900 dark:text-white font-medium underline flex items-center"
                                                  >
                                                    <Eye className="h-3 w-3 mr-1" /> View
                                                  </button>
                                                ) : (
                                                  <span className="text-slate-600">—</span>
                                                )}
                                              </td>
                                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{h.updatedByName || 'System'}</td>
                                              <td className="py-3 px-4 text-slate-500 dark:text-slate-500">{new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                            </tr>
                                          );
                                        });
                                      })()}
                                    </tbody>
                                  </table>
                                </div>

                                <Pagination
                                  currentPage={historyPagination.currentPage}
                                  totalPages={historyPagination.totalPages}
                                  totalItems={historyPagination.totalItems}
                                  itemsPerPage={historyPagination.itemsPerPage}
                                  onPageChange={historyPagination.goToPage}
                                  onItemsPerPageChange={historyPagination.setItemsPerPage}
                                />
                              </div>
                            );
                          })()}
                        </div>
                        {showMobilePreview && (
                          <div className="hidden lg:block w-[350px] shrink-0 border-l border-slate-300 dark:border-white/5 pl-6 h-[calc(100vh-120px)] sticky top-[90px] overflow-y-auto overflow-x-hidden">
                            <MobilePreview mode="CHECKLIST" checklistItems={checklistSubTab === 'history' ? checklistHistory : activeList} title={NAV_CONFIG.find(n => n.tab === activeTab)?.label} />
                          </div>
                        )}
                      </div>
                    );
                  })()}


                  {/* COMPLIANCE TELEMETRY TAB */}
                  {activeTab === 'compliance' && (
                    <div className={`w-full ${showMobilePreview ? 'lg:flex items-start' : ''}`}>
                      <div className="flex-1 space-y-6 lg:pr-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compliance Desk</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">SEBI compliance monitoring, alerts, checklists & penalty management</p>
                          </div>
                          <div className="flex space-x-2">
                            <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 mr-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Preview</span>
                              <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
                                <div className="w-8 h-4 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                              </div>
                            </label>
                            <button onClick={() => setShowReportModal(true)} disabled={downloadingReport} className="px-4 py-2 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-2 disabled:opacity-50">
                              {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              <span>Download Periodic Report</span>
                            </button>
                            <button onClick={handleComplianceSweep} disabled={sweepLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-2 disabled:opacity-50">
                              {sweepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              <span>Run Verification Sweep</span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-tabs and Global Filter */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                            {[
                              { id: 'overview', label: 'Compliance Overview' },
                              { id: 'alerts', label: `Automated Alerts (${alerts.filter(a => a.status === 'OPEN').length})` },
                              { id: 'penalties', label: `Penalties (${penalties.filter(p => p.status === 'PENDING_PAYMENT').length} Pending)` },
                              { id: 'complaints', label: `Complaints (${complaints.filter(c => c.status === 'OPEN').length} Open)` },
                              { id: 'audit_history', label: 'Audit Log' }
                            ].map(tab => (
                              <button key={tab.id} onClick={() => setComplianceTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${complianceTab === tab.id ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}>
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900/40 p-1.5 rounded-xl border border-slate-300 dark:border-white/5 w-fit">
                            {(!isStaff || hasPermission('EXPORT_DATA')) && (
                              <button onClick={() => handleDownloadCSV(complianceTab)} className="px-3 py-1.5 bg-white dark:bg-[#151e32] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-indigo-500/20 mr-2">
                                <Download className="w-3.5 h-3.5" /> Export CSV
                              </button>
                            )}
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2">Financial Year:</span>
                            <select
                              value={selectedFinancialYear}
                              onChange={(e) => setSelectedFinancialYear(e.target.value)}
                              className="bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 text-slate-900 dark:text-white text-xs py-1.5 px-3 rounded-lg focus:ring-0 focus:outline-none hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 transition cursor-pointer"
                            >
                              <option value="All">All Financial Years</option>
                              {availableFinancialYears.map(fy => (
                                <option key={fy as string} value={fy as string}>{fy as string}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* COMPLIANCE OVERVIEW TAB */}
                        {complianceTab === 'overview' && (
                          <div className="space-y-6">
                            {/* Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              {/* Complaints Card */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-slate-400 dark:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Complaints Overview</span>
                                  <p className="text-4xl font-extrabold mt-2 text-slate-900 dark:text-white">{complaints.filter((c: any) => c.status === 'OPEN').length} <span className="text-sm font-medium text-slate-500 dark:text-slate-500">Open</span></p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Resolved:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">{complaints.filter((c: any) => c.status === 'CLOSED').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Breached SLA:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{complaints.filter((c: any) => c.status === 'OPEN' && new Date(c.deadlineAt).getTime() <= Date.now()).length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <Users className="h-6 w-6" />
                                </div>
                              </div>

                              {/* Penalties Card */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_8px_30px_rgba(244,63,94,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">BSE Penalties Overview</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">₹{(penalties.filter((p: any) => p.status === 'PENDING_PAYMENT').reduce((acc: number, p: any) => acc + p.amount, 0)).toLocaleString()}</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Pending Count:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{penalties.filter((p: any) => p.status === 'PENDING_PAYMENT').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Total Compliant:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">₹{(penalties.filter((p: any) => p.status === 'PAID').reduce((acc: number, p: any) => acc + p.amount, 0)).toLocaleString()}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <FileText className="h-6 w-6" />
                                </div>
                              </div>

                              {/* SEBI Checklist Score */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Checklist Compliance</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">{checklist.length > 0 ? Math.round((checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length / checklist.length) * 100) : 0}%</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Compliant:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">{checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Non-Compliant:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{checklist.filter((item: any) => item.audit?.status === 'NON_COMPLIANT').length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <ShieldCheck className="h-6 w-6" />
                                </div>
                              </div>

                              {/* Automated Alerts */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Alerts</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">{alerts.filter((a: any) => a.status === 'OPEN').length}</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>High Severity:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{alerts.filter((a: any) => a.status === 'OPEN' && a.severity === 'HIGH').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Medium/Low:</span> <strong className="text-amber-600 dark:text-amber-400 px-1.5 py-0.5 bg-amber-500/10 rounded">{alerts.filter((a: any) => a.status === 'OPEN' && a.severity !== 'HIGH').length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <AlertTriangle className="h-6 w-6" />
                                </div>
                              </div>
                            </div>

                            {/* Dashboard Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left: Urgent complaints */}
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Urgent SEBI Complaints (SCORES)</h3>
                                  <button onClick={() => setComplianceTab('complaints')} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300">
                                    View All
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {complaints.filter((c: any) => c.status === 'OPEN').map((c: any) => {
                                    const daysLeft = Math.ceil((new Date(c.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                                    const isBreached = daysLeft < 0;
                                    const isWarning = daysLeft >= 0 && daysLeft <= 5;
                                    return (
                                      <div key={c.id} className="p-4 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {c.clientName}
                                            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-normal">({c.source})</span>
                                          </div>
                                          <div className="text-slate-600 dark:text-slate-400 text-[10px]">{c.subject}</div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${isBreached ? 'bg-red-500/20 text-red-600 dark:text-red-400' : isWarning ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                            {isBreached ? 'SLA BREACHED' : `${daysLeft} days left`}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {complaints.filter((c: any) => c.status === 'OPEN').length === 0 && (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs">No open complaints. Standard SEBI compliance maintained.</div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Unpaid penalties & Progress bar */}
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Levied BSE Penalties Overview</h3>
                                    <button onClick={() => setComplianceTab('penalties')} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300">
                                      View All
                                    </button>
                                  </div>

                                  {/* Penalty Collection Progress Bar */}
                                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Penalty Compliant Rate</span>
                                      <strong className="text-emerald-600 dark:text-emerald-400">
                                        {(() => {
                                          const total = penalties.reduce((acc: number, p: any) => acc + p.amount, 0);
                                          const paid = penalties.filter((p: any) => p.status === 'PAID').reduce((acc: number, p: any) => acc + p.amount, 0);
                                          return total > 0 ? Math.round((paid / total) * 100) : 100;
                                        })()}% (₹{(penalties.filter((p: any) => p.status === 'PAID').reduce((acc: number, p: any) => acc + p.amount, 0)).toLocaleString()} of ₹{(penalties.reduce((acc: number, p: any) => acc + p.amount, 0)).toLocaleString()})
                                      </strong>
                                    </div>
                                    <div className="h-2 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-400 transition-all duration-500"
                                        style={{
                                          width: `${(() => {
                                            const total = penalties.reduce((acc: number, p: any) => acc + p.amount, 0);
                                            const paid = penalties.filter((p: any) => p.status === 'PAID').reduce((acc: number, p: any) => acc + p.amount, 0);
                                            return total > 0 ? Math.round((paid / total) * 100) : 100;
                                          })()}%`
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <PaginatedList data={penalties.filter((p: any) => p.status === 'PENDING_PAYMENT')} itemsPerPage={5}>
                                      {(pageData) => (
                                        <>
                                          {pageData.map((p: any) => (
                                            <div key={p.id} className="p-4 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                              <div className="space-y-1 max-w-[70%]">
                                                <div className="font-bold text-slate-900 dark:text-white truncate">{p.audit?.requirement?.requirement || p.reason}</div>
                                                <div className="text-slate-600 dark:text-slate-400 text-[10px] truncate">{p.reason}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="font-extrabold text-rose-600 dark:text-rose-400 mb-1">₹{p.amount.toLocaleString()}</div>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold uppercase tracking-wider">NON-COMPLIANT</span>
                                              </div>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                    </PaginatedList>
                                    {penalties.filter((p: any) => p.status === 'PENDING_PAYMENT').length === 0 && (
                                      <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs">No pending penalties. Excellent audit record!</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}


                        {complianceTab === 'alerts' && (() => {
                          const displayAlerts = (alertsSubTab === 'active'
                            ? alerts.filter((a: any) => a.status === 'OPEN')
                            : alerts.filter((a: any) => a.status === 'CLOSED'))
                            .filter((a: any) => selectedFinancialYear === 'All' || getFinancialYear(a.createdAt) === selectedFinancialYear);

                          return (
                            <div className="space-y-6">
                              <div className="flex justify-between items-center">
                                <div className="flex space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                                  <button
                                    onClick={() => setAlertsSubTab('active')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${alertsSubTab === 'active' ? 'bg-amber-600 text-slate-900 dark:text-white shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
                                  >
                                    Active Alerts ({alerts.filter((a: any) => a.status === 'OPEN').length})
                                  </button>
                                  <button
                                    onClick={() => setAlertsSubTab('history')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${alertsSubTab === 'history' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}
                                  >
                                    Resolved History ({alerts.filter((a: any) => a.status === 'CLOSED').length})
                                  </button>
                                </div>

                                <div className="flex items-center space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl border border-slate-300 dark:border-white/5 shadow-sm">
                                  <button
                                    onClick={() => setAlertViewMode('card')}
                                    className={`p-1.5 rounded-lg transition ${alertViewMode === 'card' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-slate-800'}`}
                                    title="Card View"
                                  >
                                    <LayoutGrid className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setAlertViewMode('table')}
                                    className={`p-1.5 rounded-lg transition ${alertViewMode === 'table' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-slate-800'}`}
                                    title="Table View"
                                  >
                                    <TableIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <PaginatedList data={displayAlerts} itemsPerPage={10}>
                                {(pageData) => (
                                  alertViewMode === 'table' ? (
                                    <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-sm">
                                      <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-300 dark:border-white/5 text-slate-600 dark:text-slate-400 font-semibold">
                                          <tr>
                                            <th className="px-6 py-4">Alert Type</th>
                                            <th className="px-6 py-4">Severity</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4">Created Date</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                          {pageData.map((a: any) => {
                                            let severityBadge = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
                                            let statusBadge = a.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
                                            let resolveBtnColor = "bg-amber-600 hover:bg-amber-500 text-white";

                                            if (a.severity === 'HIGH') {
                                              severityBadge = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-bold";
                                              resolveBtnColor = "bg-rose-600 hover:bg-rose-500 text-white";
                                            } else if (a.severity === 'MEDIUM') {
                                              severityBadge = "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-bold";
                                              resolveBtnColor = "bg-orange-600 hover:bg-orange-500 text-white";
                                            } else if (a.severity === 'LOW') {
                                              severityBadge = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 font-bold";
                                              resolveBtnColor = "bg-yellow-600 hover:bg-yellow-500 text-white";
                                            }

                                            return (
                                              <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold">{a.alertType === 'PENALTY_LEVIED' ? 'PENALTY RISK' : a.alertType.replace(/_/g, ' ')}</td>
                                                <td className="px-6 py-4">
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${severityBadge}`}>{a.severity}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-normal min-w-[300px] max-w-[500px] text-xs">
                                                  {formatAlertDescription(a.description)}
                                                </td>
                                                <td className="px-6 py-4 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-transparent ${statusBadge}`}>{a.status}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                  {a.status === 'OPEN' && (
                                                    <button
                                                      onClick={() => {
                                                        if (a.alertType === 'PENALTY_LEVIED' && a.penaltyId) {
                                                          setPenaltyResolveId(a.penaltyId);
                                                          setPenaltyPayRef('');
                                                          setPenaltyProof(null);
                                                          setPenaltyRemarks('');
                                                        } else if (['KYC_MISSING', 'KYC_FAILED', 'AGREEMENT_MISSING', 'PAN_MISSING'].includes(a.alertType)) {
                                                          handleResolveAlert(a.id, a.alertType);
                                                        } else {
                                                          setClosingAlertId(a.id);
                                                          setDepositTopup(a.alertType === 'DEPOSIT_LOW' ? '50000' : '');
                                                          setCloseRemarks('');
                                                          setAlertProof(null);
                                                        }
                                                      }}
                                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${resolveBtnColor}`}
                                                    >
                                                      Resolve
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {pageData.map((a: any) => {
                                        let cardColor = "bg-amber-500/5 border-amber-500/15 text-slate-700 dark:text-slate-300";
                                        let titleColor = "text-amber-200";
                                        let severityBadge = "bg-rose-500/20 text-rose-700 dark:text-rose-300";
                                        let resolveBtnColor = "bg-amber-600/20 border-amber-500/30 hover:bg-amber-600/30 text-amber-200";
                                        let statusBadge = a.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-400/5 text-amber-600 dark:text-amber-400 border-amber-400/15';
                                        let descColor = "text-slate-700 dark:text-slate-300";

                                        if (a.severity === 'HIGH') {
                                          cardColor = "bg-gradient-to-b from-rose-950/40 to-slate-50 dark:to-[#0a0f18] border-rose-500/20 border-t-rose-500/80 border-t-4 shadow-[0_5px_15px_rgba(244,63,94,0.05)] text-rose-200";
                                          titleColor = "text-slate-900 dark:text-white";
                                          severityBadge = "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold";
                                          resolveBtnColor = "bg-rose-600 border border-rose-500 hover:bg-rose-500 text-slate-900 dark:text-white shadow-lg shadow-rose-500/20";
                                          descColor = "text-slate-700 dark:text-slate-300";
                                        } else if (a.severity === 'MEDIUM') {
                                          cardColor = "bg-gradient-to-b from-orange-950/40 to-slate-50 dark:to-[#0a0f18] border-orange-500/20 border-t-orange-500/80 border-t-4 shadow-[0_5px_15px_rgba(249,115,22,0.05)] text-orange-200";
                                          titleColor = "text-slate-900 dark:text-white";
                                          severityBadge = "bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold";
                                          resolveBtnColor = "bg-orange-600 border border-orange-500 hover:bg-orange-500 text-slate-900 dark:text-white shadow-lg shadow-orange-500/20";
                                          descColor = "text-slate-700 dark:text-slate-300";
                                        } else if (a.severity === 'LOW') {
                                          cardColor = "bg-gradient-to-b from-yellow-950/30 to-slate-50 dark:to-[#0a0f18] border-yellow-500/20 border-t-yellow-500/80 border-t-4 shadow-[0_5px_15px_rgba(234,179,8,0.05)] text-yellow-200";
                                          titleColor = "text-slate-900 dark:text-white";
                                          severityBadge = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 font-extrabold";
                                          resolveBtnColor = "bg-yellow-600 border border-yellow-500 hover:bg-yellow-500 text-slate-900 dark:text-white shadow-lg shadow-yellow-500/20";
                                          descColor = "text-slate-700 dark:text-slate-300";
                                        }

                                        return (
                                          <div key={a.id} className={`p-6 rounded-2xl flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${cardColor}`}>
                                            <div className="space-y-3">
                                              <div className="flex items-center justify-between">
                                                <span className={`font-black text-sm tracking-wide ${titleColor}`}>{a.alertType === 'PENALTY_LEVIED' ? 'PENALTY RISK' : a.alertType.replace(/_/g, ' ')}</span>
                                                <div className="flex items-center space-x-2">
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${severityBadge}`}>{a.severity}</span>
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>{a.status}</span>
                                                </div>
                                              </div>
                                              <p className={`text-[13px] leading-relaxed ${descColor}`}>{formatAlertDescription(a.description)}</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-white/5 text-[10px] text-slate-600 dark:text-slate-400">
                                              <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                                              {a.status === 'OPEN' && (
                                                <button
                                                  onClick={() => {
                                                    if (a.alertType === 'PENALTY_LEVIED' && a.penaltyId) {
                                                      setPenaltyResolveId(a.penaltyId);
                                                      setPenaltyPayRef('');
                                                      setPenaltyProof(null);
                                                      setPenaltyRemarks('');
                                                    } else if (['KYC_MISSING', 'KYC_FAILED', 'AGREEMENT_MISSING', 'PAN_MISSING'].includes(a.alertType)) {
                                                      handleResolveAlert(a.id, a.alertType);
                                                    } else {
                                                      setClosingAlertId(a.id);
                                                      setDepositTopup(a.alertType === 'DEPOSIT_LOW' ? '50000' : '');
                                                      setCloseRemarks('');
                                                      setAlertProof(null);
                                                    }
                                                  }}
                                                  className={`px-3 py-1.5 border rounded font-semibold transition ${resolveBtnColor}`}
                                                >
                                                  Resolve Alert
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )
                                )}
                              </PaginatedList>
                              {displayAlerts.length === 0 && (
                                <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/5">
                                  {alertsSubTab === 'active' ? '✅ No active compliance alerts. Excellent!' : 'No resolved alerts in history.'}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* COMPLAINTS TAB */}
                        {complianceTab === 'complaints' && (
                          <div className="space-y-6">
                            {/* Summary Dashboard */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex items-center space-x-4">
                                <div className="p-4 bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full"><AlertTriangle className="h-6 w-6" /></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Open Complaints</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c: any) => c.status === 'OPEN').length}</p></div>
                              </div>
                              <div className="glassmorphism p-6 rounded-2xl border border-orange-500/30 flex items-center space-x-4">
                                <div className="p-4 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full"><AlertTriangle className="h-6 w-6" /></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Approaching Deadline</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c: any) => c.status === 'OPEN' && new Date(c.deadlineAt).getTime() - Date.now() < 5 * 24 * 3600 * 1000 && new Date(c.deadlineAt).getTime() > Date.now()).length}</p></div>
                              </div>
                              <div className="glassmorphism p-6 rounded-2xl border border-red-500/30 flex items-center space-x-4">
                                <div className="p-4 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full"><CheckCircle className="h-6 w-6" /></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Resolved Complaints</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c: any) => c.status === 'CLOSED').length}</p></div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-bold">SEBI Grievances (SCORES)</h3>
                              <button onClick={() => {
                                setIsComplaintModalOpen(true);
                                setComplaintSearchQuery('');
                                setComplaintFoundClient(null);
                                setShowClientNotFoundAlert(false);
                                setIsManualFillAllowed(false);
                                setComplaintClientName('');
                                setComplaintEmail('');
                                setComplaintMobile('');
                                setComplaintPan('');
                                setComplaintSubject('');
                                setComplaintDescription('');
                                setComplaintReceivedAt('');
                              }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-bold flex items-center"><Plus className="h-4 w-4 mr-2" /> Log Complaint</button>
                            </div>

                            <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                              <PaginatedList data={complaints.filter((c: any) => selectedFinancialYear === 'All' || getFinancialYear(c.receivedAt) === selectedFinancialYear)} itemsPerPage={10}>
                                {(pageData) => (
                                  <table className="w-full text-left">
                                    <thead className="bg-slate-100 dark:bg-white/5 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-400 dark:border-white/10">
                                      <tr><th className="px-6 py-4">Client</th><th className="px-6 py-4">Source</th><th className="px-6 py-4">Subject</th><th className="px-6 py-4">Received</th><th className="px-6 py-4">Deadline</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-300 dark:divide-white/5 text-sm">
                                      {pageData.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">No complaints logged.</td></tr>
                                      ) : pageData.map((c: any) => {
                                        const daysLeft = Math.ceil((new Date(c.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                                        const isBreached = daysLeft < 0 && c.status !== 'CLOSED';
                                        const isWarning = daysLeft >= 0 && daysLeft <= 5 && c.status !== 'CLOSED';

                                        return (
                                          <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                            <td className="px-6 py-4 font-medium">{c.clientName}</td>
                                            <td className="px-6 py-4">{c.source} {c.scoresRefId && <span className="block text-xs text-slate-600 dark:text-slate-400">{c.scoresRefId}</span>}</td>
                                            <td className="px-6 py-4">{c.subject}</td>
                                            <td className="px-6 py-4">{new Date(c.receivedAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                              {c.status === 'CLOSED' ? '-' : (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${isBreached ? 'bg-red-500/20 text-red-600 dark:text-red-400' : isWarning ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                                  {daysLeft} days left
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.status === 'CLOSED' ? 'bg-slate-500/20 text-slate-600 dark:text-slate-400' : 'bg-primary-500/20 text-primary-600 dark:text-primary-400'}`}>{c.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                              {c.status !== 'CLOSED' ? (
                                                <button
                                                  onClick={() => {
                                                    setComplaintResolveId(c.id);
                                                    setComplaintAtrProof(null);
                                                    setComplaintAtrRemarks('');
                                                  }}
                                                  className="text-primary-600 dark:text-primary-400 hover:text-slate-900 dark:text-white font-medium text-xs underline"
                                                >Resolve</button>
                                              ) : (
                                                c.atrProofUrl && (
                                                  <button onClick={() => window.open(api.getBaseUrl() + '' + c.atrProofUrl, '_blank')} className="text-emerald-600 dark:text-emerald-400 hover:text-slate-900 dark:text-white font-medium text-xs inline-flex items-center"><Eye className="h-3 w-3 mr-1" /> View ATR</button>
                                                )
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </PaginatedList>
                            </div>
                          </div>
                        )}


                        {/* PENALTIES TAB */}
                        {complianceTab === 'penalties' && (
                          <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                                  <th className="py-4 px-6">Requirement</th>
                                  <th className="py-4 px-6">Overdue Date</th>
                                  <th className="py-4 px-6">Resolved Date</th>
                                  <th className="py-4 px-6">Remarks</th>
                                  <th className="py-4 px-6">Proof</th>
                                  <th className="py-4 px-6">Status</th>
                                  {user.role === 'COMPLIANCE_OFFICER' && <th className="py-4 px-6 text-center">Action</th>}
                                </tr>
                              </thead>
                              <PaginatedList data={penalties.filter((p: any) => selectedFinancialYear === 'All' || getFinancialYear(p.createdAt || p.audit?.createdAt) === selectedFinancialYear)} itemsPerPage={10}>
                                {(pageData) => (
                                  <tbody className="text-[13px] divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                    {pageData.map((p: any) => (
                                      <tr key={p.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800/40 transition-colors duration-200 group border-b border-slate-300 dark:border-white/5">
                                        <td className="py-4 px-6 font-semibold max-w-xs text-slate-900 dark:text-white">
                                          <div className="font-bold text-slate-900 dark:text-white text-sm max-w-[200px] truncate" title={p.audit?.requirement?.requirement || '-'}>{p.audit?.requirement?.requirement || '-'}</div>
                                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1" title={p.reason}>BSE suggested Penalty: ₹{p.amount.toLocaleString()}</div>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-500 font-medium">{(p.audit?.dueDate || p.audit?.createdAt) ? new Date(p.audit.dueDate || p.audit.createdAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-500 font-medium">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}</td>
                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-500 font-medium"><span className="block max-w-[150px] truncate" title={p.remarks || '-'}>{p.remarks || '-'}</span></td>
                                        <td className="py-4 px-6 text-sm">
                                          {p.proofUrl ? (
                                            <a href={getFullUrl(p.proofUrl)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-semibold text-xs">
                                              <Eye className="w-3 h-3" /> View Image
                                            </a>
                                          ) : (
                                            <span className="text-slate-500 dark:text-slate-500 text-xs">-</span>
                                          )}
                                        </td>
                                        <td className="py-4 px-6">
                                          <span className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'}`}>{p.status === 'PENDING_PAYMENT' ? 'NON-COMPLIANT' : p.status === 'PAID' ? 'COMPLIANT' : p.status.replace('_', ' ')}</span>
                                        </td>
                                        {user.role === 'COMPLIANCE_OFFICER' && (
                                          <td className="py-4 px-6 text-center">
                                            {p.status === 'PENDING_PAYMENT' ? (
                                              <button onClick={() => { setPenaltyResolveId(p.id); setPenaltyResolutionType(''); setPenaltyPayRef(''); setPenaltyProof(null); setPenaltyRemarks(''); }} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 hover:shadow-emerald-500/40">Submit Proof</button>
                                            ) : (
                                              <span className="text-slate-500 dark:text-slate-500 text-xs font-semibold px-4 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg">Resolved</span>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                    {pageData.length === 0 && (
                                      <tr><td colSpan={6} className="text-center py-16 text-slate-500 dark:text-slate-500 font-medium">No penalties levied. Great job!</td></tr>
                                    )}
                                  </tbody>
                                )}
                              </PaginatedList>
                            </table>
                          </div>
                        )}

                        {/* AUDIT LOG TAB */}
                        {complianceTab === 'audit_history' && (() => {
                          const combinedHistory = [
                            ...alerts.filter(a => a.status === 'CLOSED').map(a => ({
                              id: a.id,
                              type: 'ALERT_RESOLVED',
                              title: `Alert Resolved: ${a.alertType.replace(/_/g, ' ')}`,
                              desc: a.remarks || 'Alert closed',
                              date: new Date(a.closedAt || a.updatedAt),
                              proofUrl: a.proofUrl
                            })),
                            ...penalties.filter(p => p.status === 'PAID').map(p => ({
                              id: p.id,
                              type: 'PENALTY_PAID',
                              title: `Penalty Paid: ₹${p.amount.toLocaleString()}`,
                              desc: p.remarks || 'Payment verified',
                              date: new Date(p.paidAt || p.updatedAt),
                              proofUrl: p.proofUrl
                            })),
                            ...checklistHistory.map(h => ({
                              id: h.id,
                              type: 'CHECKLIST_UPDATE',
                              title: `Checklist Update: ${h.requirement?.requirement || 'Requirement'}`,
                              desc: `Status changed to ${h.newStatus}. ${h.officerRemarks || ''}`,
                              date: new Date(h.createdAt),
                              proofUrl: h.proofDocumentUrl
                            }))
                          ].sort((a, b) => b.date.getTime() - a.date.getTime())
                            .filter((item: any) => selectedFinancialYear === 'All' || getFinancialYear(item.date.toISOString()) === selectedFinancialYear);

                          return (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-400 dark:border-white/10">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Complete Compliance History</h3>
                              </div>
                              <PaginatedList data={combinedHistory} itemsPerPage={10}>
                                {(pageData) => (
                                  <div className="space-y-4">
                                    {pageData.length > 0 ? pageData.map((item: any) => (
                                      <div key={item.id} className="p-4 bg-white dark:bg-slate-900/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-start gap-4 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                        <div className={`p-2 rounded-lg mt-1 shrink-0 ${item.type === 'ALERT_RESOLVED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                          item.type === 'PENALTY_PAID' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                          }`}>
                                          {item.type === 'ALERT_RESOLVED' && <AlertTriangle className="h-4 w-4" />}
                                          {item.type === 'PENALTY_PAID' && <FileText className="h-4 w-4" />}
                                          {item.type === 'CHECKLIST_UPDATE' && <ShieldCheck className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-2 font-medium">{item.date.toLocaleString('en-IN')}</div>
                                        </div>
                                        {item.proofUrl && (
                                          <a href={item.proofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded-lg transition shrink-0">
                                            <ExternalLink className="h-3 w-3" />
                                            View Proof (SS)
                                          </a>
                                        )}
                                      </div>
                                    )) : (
                                      <div className="text-center py-12 text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/5">
                                        No compliance history recorded yet.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </PaginatedList>
                            </div>
                          );
                        })()}
                      </div>
                      {showMobilePreview && (
                        <div className="hidden lg:block w-[350px] shrink-0 border-l border-slate-300 dark:border-white/5 pl-6 h-[calc(100vh-120px)] sticky top-[90px] overflow-y-auto overflow-x-hidden">
                          <MobilePreview
                            mode="COMPLIANCE"
                            complianceItems={
                              complianceTab === 'overview' ? [
                                { _isOverview: true, title: 'Complaints', value: `${complaints.filter((c: any) => c.status === 'OPEN').length}`, suffix: `Open (${complaints.filter((c: any) => c.status === 'CLOSED').length} Resolved)`, colorType: 'primary' },
                                { _isOverview: true, title: 'BSE Penalties', value: `₹${(penalties.filter((p: any) => p.status === 'PENDING_PAYMENT').reduce((acc: number, p: any) => acc + p.amount, 0)).toLocaleString()}`, suffix: `${penalties.filter((p: any) => p.status === 'PENDING_PAYMENT').length} Pending`, colorType: 'rose' },
                                { _isOverview: true, title: 'Checklist', value: `${checklist.length > 0 ? Math.round((checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length / checklist.length) * 100) : 0}%`, suffix: `${checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length} Compliant`, colorType: 'emerald' },
                                { _isOverview: true, title: 'Active Alerts', value: `${alerts.filter((a: any) => a.status === 'OPEN').length}`, suffix: `${alerts.filter((a: any) => a.status === 'OPEN' && a.severity === 'HIGH').length} High Severity`, colorType: 'amber' }
                              ] :
                                complianceTab === 'alerts' ? alerts :
                                  complianceTab === 'penalties' ? penalties :
                                    complianceTab === 'complaints' ? complaints :
                                      checklistHistory
                            }
                            title={NAV_CONFIG.find(n => n.tab === activeTab)?.label}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ====================================================
                CLIENT MANAGEMENT TAB
               ==================================================== */}
                  {activeTab === 'clients' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Management</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">View and manage all clients registered under your RA company</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                            <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{clients.length} Clients</span>
                          </div>

                          <button
                            onClick={() => {
                              try {
                                let rawList = clientSubTab === 'deleted' ? deletedClients : clients.filter((cl: any) => !cl.user?.deletedAt);

                                // Apply active filters
                                if (statusFilter !== 'ALL') {
                                  rawList = rawList.filter((cl: any) => {
                                    if (statusFilter === 'INACTIVE') return !['ACTIVE', 'PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(cl.user?.status);
                                    return cl.user?.status === statusFilter;
                                  });
                                }
                                if (kraFilter !== 'ALL') {
                                  rawList = rawList.filter((cl: any) => {
                                    const isFailed = cl.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED');
                                    const kraStatusStr = isFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                                    return kraStatusStr === kraFilter;
                                  });
                                }
                                if (esignFilter !== 'ALL') {
                                  rawList = rawList.filter((cl: any) => {
                                    const isSigned = cl.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                                    return esignFilter === 'SIGNED' ? isSigned : !isSigned;
                                  });
                                }
                                if (sourceFilter !== 'ALL') {
                                  rawList = rawList.filter((cl: any) => {
                                    const srcType = cl.createdByInfo?.type || (cl.createdById ? 'STAFF' : 'SELF');
                                    return srcType === sourceFilter;
                                  });
                                }
                                if (clientStartDate) {
                                  rawList = rawList.filter((cl: any) => new Date(cl.user?.createdAt) >= new Date(clientStartDate));
                                }
                                if (clientEndDate) {
                                  const endDate = new Date(clientEndDate);
                                  endDate.setHours(23, 59, 59, 999);
                                  rawList = rawList.filter((cl: any) => new Date(cl.user?.createdAt) <= endDate);
                                }
                                if (clientSearch.trim()) {
                                  const lowerSearch = clientSearch.toLowerCase();
                                  rawList = rawList.filter((cl: any) =>
                                    (cl.name || '').toLowerCase().includes(lowerSearch) ||
                                    (cl.email || '').toLowerCase().includes(lowerSearch) ||
                                    (cl.mobile || '').includes(lowerSearch) ||
                                    (cl.pan || '').toLowerCase().includes(lowerSearch) ||
                                    (cl.aadhaar || '').replace(/\s+/g, '').includes(lowerSearch.replace(/\s+/g, ''))
                                  );
                                }

                                const listToExport = rawList;
                                if (!listToExport || listToExport.length === 0) {
                                  import('react-hot-toast').then(m => m.default.error('No client data available to export'));
                                  return;
                                }

                                const headers = [
                                  'Sr No',
                                  'Client ID',
                                  'Client Name',
                                  'Email',
                                  'Mobile',
                                  'PAN',
                                  'Aadhaar',
                                  'Category',
                                  'Occupation',
                                  'City',
                                  'State',
                                  'Registered On',
                                  'Status',
                                  'Added By / Source',
                                  'KRA Status',
                                  'eSign Status',
                                  'Active Plan'
                                ];

                                const rows = listToExport.map((cl: any, idx: number) => {
                                  const deleteSuffix = `_deleted_${cl.id}`;
                                  const name = (cl.name || '').replace(deleteSuffix, '');
                                  const email = (cl.email || '').replace(deleteSuffix, '');
                                  const mobile = (cl.mobile || '').replace(deleteSuffix, '');
                                  const pan = (cl.pan || '').replace(deleteSuffix, '');
                                  const aadhaar = (cl.aadhaar || '').replace(deleteSuffix, '');

                                  const isKraFailed = cl.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED');
                                  const kraStatus = isKraFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                                  const isSigned = cl.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                                  const activeSub = cl.subscriptions?.find((s: any) => s.status === 'ACTIVE');

                                  let sourceLabel = 'Self Signup';
                                  if (cl.createdByInfo?.label) {
                                    sourceLabel = cl.createdByInfo.label;
                                  } else if (cl.createdById) {
                                    sourceLabel = 'Added by Staff/Admin';
                                  }

                                  const registeredOn = cl.user?.createdAt
                                    ? new Date(cl.user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : 'N/A';

                                  return [
                                    idx + 1,
                                    `"${cl.id || ''}"`,
                                    `"${name.replace(/"/g, '""')}"`,
                                    `"${email.replace(/"/g, '""')}"`,
                                    `"${mobile}"`,
                                    `"${pan}"`,
                                    `"${aadhaar}"`,
                                    `"${cl.category || 'INDIVIDUAL'}"`,
                                    `"${cl.occupation || 'N/A'}"`,
                                    `"${cl.profile?.city || 'N/A'}"`,
                                    `"${cl.profile?.state || 'N/A'}"`,
                                    `"${registeredOn}"`,
                                    `"${cl.user?.status || cl.status || 'N/A'}"`,
                                    `"${sourceLabel.replace(/"/g, '""')}"`,
                                    `"${kraStatus}"`,
                                    `"${isSigned ? 'SIGNED' : 'PENDING'}"`,
                                    `"${activeSub?.plan?.name || 'None'}"`
                                  ].join(',');
                                });

                                const csvString = [headers.join(','), ...rows].join('\n');
                                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.setAttribute('href', url);
                                link.setAttribute('download', `${clientSubTab === 'deleted' ? 'Deleted_Clients_Report' : 'Complete_Clients_Report'}_${new Date().toISOString().split('T')[0]}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                import('react-hot-toast').then(m => m.default.success('Client CSV report downloaded successfully!'));
                              } catch (err: any) {
                                console.error('CSV Export Error:', err);
                                import('react-hot-toast').then(m => m.default.error('Failed to export CSV: ' + err.message));
                              }
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            Download CSV
                          </button>

                          {(!isStaff || hasPermission('CREATE_CLIENTS')) && (
                            <button
                              onClick={() => {
                                setClientName(''); setClientEmail(''); setClientMobile('');
                                setClientPassword(''); setClientPan(''); setClientAadhaar('');
                                setClientCategory('INDIVIDUAL'); setClientOccupation('');
                                setClientAddress(''); setClientCity(''); setClientState(''); setClientZip('');
                                setIsClientModalOpen(true);
                              }}
                              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs transition inline-flex items-center shadow-lg shadow-primary-500/20"
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              Add Client
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2 border-b border-slate-400 dark:border-white/10 mb-4">
                        <button
                          onClick={() => setClientSubTab('active')}
                          className={`pb-3 px-2 text-sm font-bold transition border-b-2 ${clientSubTab === 'active' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                        >
                          Active & Pending
                        </button>
                        <button
                          onClick={() => setClientSubTab('deleted')}
                          className={`pb-3 px-2 text-sm font-bold transition border-b-2 ${clientSubTab === 'deleted' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                        >
                          Deleted Accounts
                        </button>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-3 mb-4 w-full">
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search name, PAN, email..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                          />
                        </div>

                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                        >
                          <option value="ALL">All Status</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PENDING_APPROVAL">Pending Approval</option>
                          <option value="PAYMENT_PENDING">Payment Pending</option>
                          <option value="INACTIVE">Inactive/Other</option>
                        </select>

                        <select
                          value={kraFilter}
                          onChange={(e) => setKraFilter(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                        >
                          <option value="ALL">All KRA</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                          <option value="PENDING">Pending</option>
                        </select>

                        <select
                          value={esignFilter}
                          onChange={(e) => setEsignFilter(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                        >
                          <option value="ALL">All eSign</option>
                          <option value="SIGNED">Signed</option>
                          <option value="PENDING">Pending</option>
                        </select>

                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white font-medium"
                        >
                          <option value="ALL">All Sources</option>
                          <option value="SELF">Self Signup</option>
                          <option value="ADMIN">Added by Admin</option>
                          <option value="STAFF">Added by Staff</option>
                        </select>

                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={clientStartDate}
                            onChange={(e) => setClientStartDate(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                            title="Start Date"
                          />
                          <span className="text-slate-500">to</span>
                          <input
                            type="date"
                            value={clientEndDate}
                            onChange={(e) => setClientEndDate(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"
                            title="End Date"
                          />
                        </div>
                        {clientSubTab === 'deleted' && (
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/exports/deleted-clients`, {
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (!response.ok) throw new Error('Export failed');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `deleted-clients-${new Date().toISOString().split('T')[0]}.csv`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error('Failed to download CSV:', err);
                                toast.error('Failed to download deleted clients CSV.');
                              }
                            }}
                            className="ml-auto flex items-center gap-2 bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm border border-slate-700 dark:border-white/10"
                          >
                            <Download className="h-4 w-4" />
                            Download CSV
                          </button>
                        )}
                      </div>

                      {(() => {
                        let displayClients = clientSubTab === 'active'
                          ? clients.filter((cl: any) => !cl.user?.deletedAt)
                          : deletedClients;

                        // Filter by Status
                        if (statusFilter !== 'ALL') {
                          displayClients = displayClients.filter((cl: any) => {
                            if (statusFilter === 'INACTIVE') return !['ACTIVE', 'PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(cl.user?.status);
                            return cl.user?.status === statusFilter;
                          });
                        }

                        // Filter by KRA
                        if (kraFilter !== 'ALL') {
                          displayClients = displayClients.filter((cl: any) => {
                            const isFailed = cl.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED');
                            const kraStatusStr = isFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                            return kraStatusStr === kraFilter;
                          });
                        }

                        // Filter by eSign
                        if (esignFilter !== 'ALL') {
                          displayClients = displayClients.filter((cl: any) => {
                            const isSigned = cl.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                            return esignFilter === 'SIGNED' ? isSigned : !isSigned;
                          });
                        }

                        // Filter by Source / Creator
                        if (sourceFilter !== 'ALL') {
                          displayClients = displayClients.filter((cl: any) => {
                            const srcType = cl.createdByInfo?.type || (cl.createdById ? 'STAFF' : 'SELF');
                            return srcType === sourceFilter;
                          });
                        }

                        // Filter by Date
                        if (clientStartDate) {
                          displayClients = displayClients.filter((cl: any) => new Date(cl.user?.createdAt) >= new Date(clientStartDate));
                        }
                        if (clientEndDate) {
                          const endDate = new Date(clientEndDate);
                          endDate.setHours(23, 59, 59, 999);
                          displayClients = displayClients.filter((cl: any) => new Date(cl.user?.createdAt) <= endDate);
                        }

                        // Filter by Search Text
                        if (clientSearch.trim()) {
                          const lowerSearch = clientSearch.toLowerCase();
                          displayClients = displayClients.filter((cl: any) =>
                            (cl.name || '').toLowerCase().includes(lowerSearch) ||
                            (cl.email || '').toLowerCase().includes(lowerSearch) ||
                            (cl.mobile || '').includes(lowerSearch) ||
                            (cl.pan || '').toLowerCase().includes(lowerSearch) ||
                            (cl.aadhaar || '').replace(/\s+/g, '').includes(lowerSearch.replace(/\s+/g, ''))
                          );
                        }

                        return (
                          <PaginatedList data={displayClients} itemsPerPage={10}>
                            {(paginatedClients: any) => (
                              <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse min-w-[900px]">
                                    <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-400 dark:border-white/10 text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                      <tr>
                                        <th className="py-4 px-5 font-semibold">Client Name</th>
                                        <th className="py-4 px-5 font-semibold">PAN / Aadhaar</th>
                                        <th className="py-4 px-5 font-semibold">Location</th>
                                        <th className="py-4 px-5 font-semibold">Registered On</th>
                                        <th className="py-4 px-4 font-semibold">Status</th>
                                        <th className="py-4 px-4 font-semibold">Added By / Source</th>
                                        <th className="py-4 px-5 font-semibold">Esign/KRA</th>
                                        <th className="py-4 px-5 text-right font-semibold">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-xs divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                                      {paginatedClients.map((cl: any) => {
                                        const activeSub = cl.subscriptions?.find((s: any) => s.status === 'ACTIVE');
                                        const isDeleted = cl.user?.deletedAt !== null && cl.user?.deletedAt !== undefined;

                                        const deleteSuffix = `_deleted_${cl.id}`;
                                        const displayName = cl.name?.replace(deleteSuffix, '') || cl.name;
                                        const displayEmail = cl.email?.replace(deleteSuffix, '') || cl.email;
                                        const displayMobile = cl.mobile?.replace(deleteSuffix, '') || cl.mobile;
                                        const displayPan = cl.pan?.replace(deleteSuffix, '') || cl.pan;
                                        const displayAadhaar = cl.aadhaar?.replace(deleteSuffix, '') || cl.aadhaar;

                                        return (
                                          <tr key={cl.id} className={`hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition border-b border-slate-300 dark:border-white/5 ${isDeleted ? 'opacity-60 bg-rose-50 dark:bg-rose-950/10' : ''}`}>
                                            <td className="py-4 px-5">
                                              <div className="font-bold text-slate-900 dark:text-white">{displayName}</div>
                                              <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{displayEmail}</div>
                                              <div className="text-[10px] text-slate-500 dark:text-slate-500">{displayMobile}</div>
                                            </td>
                                            <td className="py-4 px-5">
                                              <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{displayPan}</div>
                                              <div className="font-mono text-slate-500 dark:text-slate-500 text-[10px] mt-0.5">{displayAadhaar?.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</div>
                                            </td>
                                            <td className="py-4 px-5">
                                              {cl.profile?.city || cl.profile?.state ? (
                                                <div>
                                                  <div className="text-slate-700 dark:text-slate-300">{cl.profile.city || '—'}</div>
                                                  <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{cl.profile.state || '—'}</div>
                                                </div>
                                              ) : (
                                                <span className="text-slate-500 dark:text-slate-500 italic text-[10px]">No Location</span>
                                              )}
                                            </td>
                                            <td className="py-4 px-5">
                                              <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-wider">
                                                {new Date(cl.user?.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </div>
                                            </td>
                                            <td className="py-4 px-4">
                                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border ${cl.user?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : cl.user?.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                                                {cl.user?.status}
                                              </span>
                                              {isDeleted && cl.user?.deletedBy && (
                                                <div className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400 mt-1">
                                                  Deleted by: {cl.user.deletedBy}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-4 px-4">
                                              {cl.createdByInfo?.type === 'SELF' || !cl.createdById ? (
                                                <span className="text-[9px] font-bold uppercase text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                  👤 Self Signup
                                                </span>
                                              ) : cl.createdByInfo?.type === 'ADMIN' ? (
                                                <span className="text-[9px] font-bold uppercase text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                  🛡️ {cl.createdByInfo?.label || 'Added by Admin'}
                                                </span>
                                              ) : (
                                                <span className="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                                  👨‍💼 {cl.createdByInfo?.label || 'Added by Staff'}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-4 px-5">
                                              <div className="flex flex-col gap-1.5 items-start">
                                                {/* KRA Status Badge */}
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${cl.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED')
                                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                  : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED')
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                                                  }`}>
                                                  KRA: {
                                                    cl.complianceAlerts?.some((a: any) => a.alertType === 'KYC_FAILED')
                                                      ? 'FAILED'
                                                      : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED')
                                                        ? 'VERIFIED'
                                                        : 'PENDING'
                                                  }
                                                </span>
                                                {/* eSign Status Badge */}
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${cl.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE')
                                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                  }`}>
                                                  eSign: {cl.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE') ? 'DONE' : 'NO'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                                              <button
                                                onClick={() => {
                                                  setSelectedClient(cl);
                                                  setIsViewClientModalOpen(true);
                                                  setClientDetailsTab('profile');
                                                }}
                                                title="View Details"
                                                className="p-1.5 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition inline-flex items-center"
                                              >
                                                <Eye className="h-3.5 w-3.5" />
                                              </button>
                                              {cl.user?.status === 'PENDING_APPROVAL' && (
                                                <button
                                                  onClick={() => handleApproveClient(cl.id)}
                                                  title="Approve Client"
                                                  className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center"
                                                >
                                                  <Check className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                              {!isDeleted ? (
                                                <>
                                                  {(!isStaff || hasPermission('EDIT_CLIENTS')) && (
                                                    <button
                                                      onClick={() => startEditClient(cl)}
                                                      title="Edit Profile"
                                                      className="p-1.5 rounded-lg border border-primary-500/10 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 transition inline-flex items-center"
                                                    >
                                                      <Edit2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  )}
                                                  {(!isStaff || hasPermission('DELETE_CLIENTS')) && (
                                                    <button
                                                      onClick={() => handleDeleteClient(cl.id)}
                                                      title="Delete Client"
                                                      className="p-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 transition inline-flex items-center"
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                  )}
                                                  {(!isStaff || hasPermission('EDIT_CLIENTS')) && (
                                                    <button
                                                      onClick={() => handleToggleClientStatus(cl.id, cl.user?.status, cl.name)}
                                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${cl.user?.status === 'ACTIVE' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                                    >
                                                      {cl.user?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                  )}
                                                  {/* -- Assign Plan Button -- */}
                                                  {(!isStaff || hasPermission('EDIT_CLIENTS')) && (
                                                    <button
                                                      onClick={() => {
                                                        setAssignPlanClient(cl);
                                                        setAssignPlanCategoryId('');
                                                        setAssignPlanId('');
                                                        setAssignPlanRemarks('');
                                                        setIsAssignPlanModalOpen(true);
                                                      }}
                                                      title="Assign Plan"
                                                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 inline-flex items-center gap-1"
                                                    >
                                                      <CreditCard className="h-3 w-3" />
                                                      <span>Assign</span>
                                                    </button>
                                                  )}
                                                </>

                                              ) : (
                                                <>
                                                  {(!isStaff || hasPermission('DELETE_CLIENTS')) && (
                                                    <button
                                                      onClick={() => handleRestoreClient(cl.id)}
                                                      title="Restore Client"
                                                      className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center"
                                                    >
                                                      <RotateCcw className="h-3.5 w-3.5" />
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {clients.length === 0 && (
                                        <tr>
                                          <td colSpan={9} className="text-center py-12 text-slate-500 dark:text-slate-500">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p>No clients registered yet.</p>
                                            <p className="text-[10px] mt-1 text-slate-600">Click "Add Client" to register your first client.</p>
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </PaginatedList>
                        );
                      })()}


                      {/* -- ASSIGN PLAN BY ADMIN MODAL -- */}
                      {isAssignPlanModalOpen && assignPlanClient && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-400 dark:border-white/10 bg-violet-500/5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/20 rounded-xl border border-violet-500/30">
                                  <CreditCard className="h-4 w-4 text-violet-400" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assign Plan to Client</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Client: <span className="text-violet-300 font-semibold">{assignPlanClient.name}</span></p>
                                </div>
                              </div>
                              <button onClick={() => setIsAssignPlanModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <form onSubmit={handleAssignPlan} className="px-6 py-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                              {/* Client Info strip */}
                              <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{assignPlanClient.name}</div>
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px]">{assignPlanClient.email}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px]">Current Plan</div>
                                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                    {assignPlanClient.subscriptions?.find((s: any) => s.status === 'ACTIVE')?.plan?.name || 'No Active Plan'}
                                  </div>
                                </div>
                              </div>

                              {/* Category selector */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                  Select Category <span className="text-rose-600 dark:text-rose-400">*</span>
                                </label>
                                <select
                                  value={assignPlanCategoryId}
                                  onChange={e => {
                                    setAssignPlanCategoryId(e.target.value);
                                    setAssignPlanId(''); // Reset plan selection
                                  }}
                                  required
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                >
                                  <option value="">-- Select a category --</option>
                                  {categories.filter((c) => c.status === 'ACTIVE').map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Plan selector (Visible only if category is selected) */}
                              {assignPlanCategoryId && (
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Select Active Plan <span className="text-rose-600 dark:text-rose-400">*</span>
                                  </label>
                                  {adminPlans.filter((p) => p.categoryId === assignPlanCategoryId && p.status === 'ACTIVE' && !p.deletedAt).length === 0 ? (
                                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                      No active plans found in this category.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                      {adminPlans.filter((p) => p.categoryId === assignPlanCategoryId && p.status === 'ACTIVE' && !p.deletedAt).map((p) => {
                                        const isSelected = assignPlanId === p.id;
                                        return (
                                          <div
                                            key={p.id}
                                            onClick={() => {
                                              setAssignPlanId(p.id);
                                              setAssignCustomAmount('');
                                              setAssignCustomDays('');
                                            }}
                                            className={`cursor-pointer p-3 rounded-xl border text-left transition relative ${isSelected ? 'bg-violet-600/15 border-violet-500 shadow-md shadow-violet-500/5' : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800/60'}`}
                                          >
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                                                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 max-w-[200px] truncate" dangerouslySetInnerHTML={{ __html: p.description || '' }} />
                                              </div>
                                              <div className="text-right flex flex-col items-end text-[10px] min-w-[120px]">
                                                {gstCalculationType === 'EXCLUSIVE' ? (
                                                  <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                                    <div className="flex justify-between gap-2"><span>Base:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{p.price.toLocaleString()}</span></div>
                                                    <div className="flex justify-between gap-2 border-b border-slate-300 dark:border-white/5 pb-0.5"><span>GST (18%):</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{Math.round(p.price * 0.18).toLocaleString()}</span></div>
                                                    <div className="flex justify-between gap-2 text-violet-400 font-extrabold pt-0.5"><span>Total:</span> <span>₹{Math.round(p.price * 1.18).toLocaleString()}</span></div>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                                    <div className="flex justify-between gap-2"><span>Base:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{p.price.toLocaleString()}</span></div>
                                                    <div className="flex justify-between gap-2 border-b border-slate-300 dark:border-white/5 pb-0.5"><span>GST:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">Inclusive</span></div>
                                                    <div className="flex justify-between gap-2 text-violet-400 font-extrabold pt-0.5"><span>Total:</span> <span>₹{p.price.toLocaleString()}</span></div>
                                                  </div>
                                                )}
                                                <span className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">{p.durationMonths} month{p.durationMonths > 1 ? 's' : ''}</span>
                                              </div>
                                            </div>
                                            {isSelected && (
                                              <div className="absolute top-2 right-2 bg-violet-500 rounded-full p-0.5">
                                                <CheckCircle className="h-3 w-3 text-slate-900 dark:text-white" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Coupon Input with Datalist */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Apply Coupon (Optional)</label>
                                <input
                                  type="text"
                                  list="active-coupons-list"
                                  value={assignCouponCode}
                                  placeholder="Type or select a coupon code"
                                  onChange={e => {
                                    const newCode = e.target.value;
                                    setAssignCouponCode(newCode);
                                    // Recalculate custom amount if custom days is present, or vice versa
                                    if (assignPlanId) {
                                      const p = adminPlans.find((x: any) => x.id === assignPlanId);
                                      if (p) {
                                        const totalAmt = getPlanAmountWithCoupon(p.price, p.durationMonths, newCode);
                                        const totalDays = p.durationMonths * 30;
                                        if (assignCustomAmount) {
                                          let val = Number(assignCustomAmount);
                                          if (val > totalAmt) val = totalAmt;
                                          setAssignCustomAmount(val.toString());
                                          if (totalAmt > 0) {
                                            setAssignCustomDays(Math.round(val / (totalAmt / totalDays)).toString());
                                          }
                                        } else if (assignCustomDays) {
                                          let dVal = Number(assignCustomDays);
                                          if (dVal > totalDays) dVal = totalDays;
                                          setAssignCustomDays(dVal.toString());
                                          if (totalDays > 0) {
                                            setAssignCustomAmount(Math.round(dVal * (totalAmt / totalDays)).toString());
                                          }
                                        }
                                      }
                                    }
                                  }}
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition uppercase"
                                />
                                <datalist id="active-coupons-list">
                                  {coupons.filter(c => c.status === 'ACTIVE').map(c => (
                                    <option key={c.id} value={c.code}>{c.code} ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`})</option>
                                  ))}
                                </datalist>
                              </div>

                              {/* Payment Details */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Ref ID *</label>
                                  <input
                                    type="text"
                                    required
                                    value={assignPaymentRefId}
                                    onChange={e => setAssignPaymentRefId(e.target.value)}
                                    placeholder="e.g. UTR/Txn Number"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Date *</label>
                                  <input
                                    type="date"
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    value={assignPaymentDate}
                                    onChange={e => setAssignPaymentDate(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                  />
                                </div>
                              </div>

                              {/* Custom Fields */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Custom Amount (₹)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={assignCustomAmount}
                                    onChange={e => {
                                      let val = e.target.value;
                                      if (!val || !assignPlanId) {
                                        setAssignCustomAmount(val);
                                        setAssignCustomDays('');
                                        return;
                                      }
                                      const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
                                      if (selectedPlan) {
                                        const totalDays = selectedPlan.durationMonths * 30;
                                        const basePrice = selectedPlan.price;
                                        const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, assignCouponCode);

                                        let numericVal = Number(val);
                                        if (numericVal > totalAmt) numericVal = totalAmt;
                                        val = numericVal.toString();
                                        setAssignCustomAmount(val);

                                        if (totalAmt > 0) {
                                          const costPerDay = totalAmt / totalDays;
                                          setAssignCustomDays(Math.round(numericVal / costPerDay).toString());
                                        }
                                      } else {
                                        setAssignCustomAmount(val);
                                      }
                                    }}
                                    placeholder="e.g. 500"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Custom Days</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={assignCustomDays}
                                    onChange={e => {
                                      let val = e.target.value;
                                      if (!val || !assignPlanId) {
                                        setAssignCustomDays(val);
                                        setAssignCustomAmount('');
                                        return;
                                      }
                                      const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
                                      if (selectedPlan) {
                                        const totalDays = selectedPlan.durationMonths * 30;
                                        const basePrice = selectedPlan.price;
                                        const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, assignCouponCode);

                                        let numericVal = Number(val);
                                        if (numericVal > totalDays) numericVal = totalDays;
                                        val = numericVal.toString();
                                        setAssignCustomDays(val);

                                        if (totalDays > 0) {
                                          const costPerDay = totalAmt / totalDays;
                                          setAssignCustomAmount(Math.round(numericVal * costPerDay).toString());
                                        }
                                      } else {
                                        setAssignCustomDays(val);
                                      }
                                    }}
                                    placeholder="e.g. 15"
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                  />
                                </div>
                              </div>

                              {/* Remarks */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Remarks (optional)</label>
                                <textarea
                                  value={assignPlanRemarks}
                                  onChange={e => setAssignPlanRemarks(e.target.value)}
                                  rows={3}
                                  placeholder="e.g. Complimentary plan for trial period..."
                                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 resize-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"
                                />
                              </div>

                              {/* Info note */}
                              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span>This will <strong>immediately activate</strong> the selected plan. Any existing active subscription will be cancelled. A payment record with <strong>"Assigned by Admin"</strong> remark will be created in the payment history.</span>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3 pt-1 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setIsAssignPlanModalOpen(false)}
                                  className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={assignPlanLoading || !assignPlanId}
                                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                                >
                                  {assignPlanLoading ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Assigning...</>
                                  ) : (
                                    <><CreditCard className="h-3.5 w-3.5" /> Assign Plan Now</>
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* Add Client Modal */}
                      {isClientModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-400 dark:border-white/10">
                              <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Client</h3>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Client will be onboarded with KYC_PENDING status</p>
                              </div>
                              <button onClick={() => setIsClientModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <div className="px-8 py-6 space-y-5">
                              {/* Personal Info */}
                              <div>
                                <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest mb-3">Personal Information</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Full Name *</label>
                                    <input
                                      value={clientName}
                                      onChange={e => setClientName(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      placeholder="e.g. Rahul Sharma"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Email *</label>
                                    <input
                                      type="email"
                                      value={clientEmail}
                                      onChange={e => {
                                        setClientEmail(e.target.value);
                                        if (clientDuplicateField === 'email') {
                                          setClientDuplicateField(null);
                                          setClientDuplicateError(null);
                                        }
                                      }}
                                      className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none transition ${clientDuplicateField === 'email' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/10 focus:border-primary-500'}`}
                                      placeholder="rahul@example.com"
                                    />
                                    {clientDuplicateField === 'email' && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Mobile *</label>
                                    <input
                                      type="tel"
                                      value={clientMobile}
                                      onChange={e => {
                                        setClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                                        if (clientDuplicateField === 'mobile') {
                                          setClientDuplicateField(null);
                                          setClientDuplicateError(null);
                                        }
                                      }}
                                      className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:outline-none transition ${clientDuplicateField === 'mobile' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/10 focus:border-primary-500'}`}
                                      placeholder="10-digit mobile number"
                                      maxLength={10}
                                    />
                                    {clientDuplicateField === 'mobile' && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Password *</label>
                                    <input
                                      type="password" value={clientPassword}
                                      onChange={e => setClientPassword(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      placeholder="Min 8 characters"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Occupation</label>
                                    <input
                                      value={clientOccupation}
                                      onChange={e => setClientOccupation(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      placeholder="e.g. Engineer, Business"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* KYC Info */}
                              <div>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-3">KYC Documents</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">PAN Number *</label>
                                    <input
                                      value={clientPan}
                                      onChange={e => {
                                        setClientPan(formatPan(e.target.value));
                                        if (clientDuplicateField === 'pan') {
                                          setClientDuplicateField(null);
                                          setClientDuplicateError(null);
                                        }
                                      }}
                                      className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:outline-none transition ${clientDuplicateField === 'pan' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/10 focus:border-emerald-500'}`}
                                      placeholder="ABCDE1234F"
                                      maxLength={10}
                                    />
                                    {clientDuplicateField === 'pan' && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Aadhaar Number *</label>
                                    <input
                                      value={clientAadhaar}
                                      onChange={e => {
                                        setClientAadhaar(formatAadhaar(e.target.value));
                                        if (clientDuplicateField === 'aadhaar') {
                                          setClientDuplicateField(null);
                                          setClientDuplicateError(null);
                                        }
                                      }}
                                      className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:outline-none transition ${clientDuplicateField === 'aadhaar' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/10 focus:border-emerald-500'}`}
                                      placeholder="12-digit Aadhaar"
                                      maxLength={12}
                                    />
                                    {clientDuplicateField === 'aadhaar' && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Category</label>
                                    <select
                                      value={clientCategory}
                                      onChange={e => setClientCategory(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition"
                                    >
                                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                                      <option value="NON_INDIVIDUAL">NON-INDIVIDUAL</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Address */}
                              <div>
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-3">Address</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Address Line 1</label>
                                    <input
                                      value={clientAddress}
                                      onChange={e => setClientAddress(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                      placeholder="Street address, Area"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">State</label>
                                    <select
                                      value={clientState}
                                      onChange={e => {
                                        setClientState(e.target.value);
                                        setClientCity(''); // Reset city when state changes
                                      }}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition appearance-none"
                                    >
                                      <option value="">Select State</option>
                                      {states.map((s: any) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">City</label>
                                    <input
                                      value={clientCity}
                                      onChange={e => setClientCity(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                      placeholder="Select or type city"
                                      list="client-city-options"
                                      disabled={!clientState}
                                    />
                                    <datalist id="client-city-options">
                                      {clientCities.map((c: any, i: number) => (
                                        <option key={i} value={c.name} />
                                      ))}
                                    </datalist>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">ZIP Code</label>
                                    <input
                                      value={clientZip}
                                      onChange={e => setClientZip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                      placeholder="400001"
                                      maxLength={6}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-slate-400 dark:border-white/10 flex space-x-3">
                              <button
                                onClick={() => {
                                  setIsClientModalOpen(false);
                                  setClientDuplicateField(null);
                                  setClientDuplicateError(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={clientModalLoading}
                                onClick={async () => {
                                  // Validate required fields
                                  if (!clientName.trim() || clientName.trim().length < 2) {
                                    toast('Full name must be at least 2 characters.'); return;
                                  }
                                  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                  if (!emailRx.test(clientEmail)) {
                                    setWizardErrors({ coEmail: 'Please enter a valid email address.' }); return;
                                  }
                                  if (!/^\d{10}$/.test(clientMobile)) {
                                    toast('Mobile number must be exactly 10 digits.'); return;
                                  }
                                  if (!clientPassword || clientPassword.length < 8) {
                                    toast('Password must be at least 8 characters.'); return;
                                  }
                                  const panRx = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
                                  if (!panRx.test(clientPan)) {
                                    toast('PAN must be in format: ABCDE1234F (10 characters).'); return;
                                  }
                                  if (!/^\d{12}$/.test(clientAadhaar)) {
                                    toast('Aadhaar number must be exactly 12 digits.'); return;
                                  }

                                  setClientModalLoading(true);
                                  setClientDuplicateField(null);
                                  setClientDuplicateError(null);
                                  try {
                                    const payload = {
                                      tenantId: user.tenantId,
                                      name: clientName.trim(),
                                      email: clientEmail.trim(),
                                      mobile: clientMobile.trim(),
                                      password: clientPassword,
                                      pan: clientPan.toUpperCase(),
                                      aadhaar: clientAadhaar,
                                      category: clientCategory,
                                      occupation: clientOccupation || undefined,
                                      addressLine1: clientAddress || undefined,
                                      city: clientCity || undefined,
                                      state: clientState || undefined,
                                      zipCode: clientZip || undefined,
                                      createdById: user.id
                                    };
                                    const r = await api.registerClient(payload);
                                    if (r.success) {
                                      setIsClientModalOpen(false);
                                      loadData();
                                      toast.success(`Client "${clientName}" registered successfully!\nStatus: KYC Pending\nThey can now login and complete KYC.`);
                                    }
                                  } catch (e: any) {
                                    if (e.duplicateField) {
                                      setClientDuplicateField(e.duplicateField);
                                      setClientDuplicateError(e.message || 'Duplicate value detected.');
                                    } else {
                                      toast.error(e.message || 'Failed to register client.');
                                    }
                                  } finally {
                                    setClientModalLoading(false);
                                  }
                                }}
                                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
                              >
                                {clientModalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                <span>{clientModalLoading ? 'Registering...' : 'Register Client'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Edit Client Modal */}
                      {isEditClientModalOpen && editingClient && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-400 dark:border-white/10">
                              <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Client Details</h3>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Modify information for client: {editingClient.name}</p>
                              </div>
                              <button onClick={() => setIsEditClientModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            <form onSubmit={handleUpdateClientSubmit}>
                              <div className="px-8 py-6 space-y-5">
                                {/* Personal Info */}
                                <div>
                                  <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest mb-3">Personal Information</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Full Name *</label>
                                      <input
                                        required
                                        value={editClientName}
                                        onChange={e => setEditClientName(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Email *</label>
                                      <input
                                        type="email"
                                        required
                                        value={editClientEmail}
                                        onChange={e => setEditClientEmail(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Mobile *</label>
                                      <input
                                        type="tel"
                                        required
                                        value={editClientMobile}
                                        onChange={e => setEditClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                        maxLength={10}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Occupation</label>
                                      <input
                                        value={editClientOccupation}
                                        onChange={e => setEditClientOccupation(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* KYC Info */}
                                <div>
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-3">KYC Documents</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">PAN Number *</label>
                                      <input
                                        required
                                        value={editClientPan}
                                        onChange={e => setEditClientPan(formatPan(e.target.value))}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
                                        maxLength={10}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Aadhaar Number *</label>
                                      <input
                                        required
                                        value={editClientAadhaar}
                                        onChange={e => setEditClientAadhaar(formatAadhaar(e.target.value))}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition"
                                        maxLength={12}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Category</label>
                                      <select
                                        value={editClientCategory}
                                        onChange={e => setEditClientCategory(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition"
                                      >
                                        <option value="INDIVIDUAL">INDIVIDUAL</option>
                                        <option value="NON_INDIVIDUAL">NON-INDIVIDUAL</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Address */}
                                <div>
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-3">Address</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Address Line 1</label>
                                      <input
                                        value={editClientAddress}
                                        onChange={e => setEditClientAddress(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">State</label>
                                      <select
                                        value={editClientState}
                                        onChange={e => {
                                          setEditClientState(e.target.value);
                                          setEditClientCity(''); // Reset city when state changes
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition appearance-none"
                                      >
                                        <option value="">Select State</option>
                                        {states.map((s: any) => (
                                          <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">City</label>
                                      <input
                                        value={editClientCity}
                                        onChange={e => setEditClientCity(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                        placeholder="Select or type city"
                                        list="edit-client-city-options"
                                        disabled={!editClientState}
                                      />
                                      <datalist id="edit-client-city-options">
                                        {editClientCities.map((c: any, i: number) => (
                                          <option key={i} value={c.name} />
                                        ))}
                                      </datalist>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">ZIP Code</label>
                                      <input
                                        value={editClientZip}
                                        onChange={e => setEditClientZip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition"
                                        maxLength={6}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="px-8 py-5 border-t border-slate-400 dark:border-white/10 flex space-x-3">
                                <button
                                  type="button"
                                  onClick={() => setIsEditClientModalOpen(false)}
                                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={editClientModalLoading}
                                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition"
                                >
                                  {editClientModalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-slate-950" />}
                                  <span>{editClientModalLoading ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {/* View Client Details Modal */}
                      {isViewClientModalOpen && selectedClient && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/40">
                              <div>
                                <div className="flex items-center space-x-3">
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedClient.name}</h3>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${selectedClient.user?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                                    {selectedClient.user?.status}
                                  </span>
                                  <span className="text-xs text-slate-600 dark:text-slate-400">({selectedClient.category})</span>
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">Client ID: {selectedClient.id}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setIsViewClientModalOpen(false);
                                  setSelectedClient(null);
                                }}
                                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>

                            {/* Modal Tabs Selection */}
                            <div className="flex px-8 border-b border-slate-400 dark:border-white/10 bg-white dark:bg-slate-900/60 p-1 space-x-2 text-xs">
                              {[
                                { id: 'profile', label: 'Profile Overview' },
                                { id: 'kyc', label: 'KYC & Documents' },
                                { id: 'subscriptions', label: 'Subscription Logs' },
                                { id: 'communications', label: 'Communications' }
                              ].map(tab => (
                                <button
                                  key={tab.id}
                                  onClick={() => setClientDetailsTab(tab.id as any)}
                                  className={`px-4 py-2.5 font-bold transition rounded-lg ${clientDetailsTab === tab.id ? 'bg-primary-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {/* Modal Scrollable Content */}
                            <div className="p-8 overflow-y-auto flex-grow space-y-6">
                              {clientDetailsTab === 'profile' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Contact Details */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Contact Details</h4>
                                    <div className="space-y-2.5 text-xs">
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Email Address</span><strong className="text-slate-900 dark:text-white">{selectedClient.email?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.email}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Mobile Number</span><strong className="text-slate-900 dark:text-white">{selectedClient.mobile?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.mobile}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Occupation</span><strong className="text-slate-900 dark:text-white">{selectedClient.occupation || '—'}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">PAN</span><strong className="text-slate-900 dark:text-white font-mono">{selectedClient.pan?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.pan}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Aadhaar</span><strong className="text-slate-900 dark:text-white font-mono">{selectedClient.aadhaar?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.aadhaar}</strong></div>
                                    </div>
                                  </div>

                                  {/* Address Details */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Address Info</h4>
                                    <div className="space-y-2.5 text-xs">
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Street Address</span><strong className="text-slate-900 dark:text-white text-right max-w-[60%] truncate">{selectedClient.profile?.addressLine1 || '—'}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">City</span><strong className="text-slate-900 dark:text-white">{selectedClient.profile?.city || '—'}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">State</span><strong className="text-slate-900 dark:text-white">{selectedClient.profile?.state || '—'}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">ZIP Code</span><strong className="text-slate-900 dark:text-white font-mono">{selectedClient.profile?.zipCode || '—'}</strong></div>
                                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Country</span><strong className="text-slate-900 dark:text-white">{selectedClient.profile?.country || 'India'}</strong></div>
                                    </div>
                                  </div>

                                  {/* Investment Profile */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4 md:col-span-2">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Risk & Investment Profile</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                      <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-300 dark:border-white/5">
                                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase">Risk Profile</span>
                                        <strong className="text-slate-900 dark:text-white block mt-1">{selectedClient.profile?.riskProfile || 'MODERATE'}</strong>
                                      </div>
                                      <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-300 dark:border-white/5">
                                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase">Net Worth</span>
                                        <strong className="text-slate-900 dark:text-white block mt-1">{selectedClient.profile?.netWorth ? `₹${selectedClient.profile.netWorth.toLocaleString()}` : '—'}</strong>
                                      </div>
                                      <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-300 dark:border-white/5">
                                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase">Investment Limit</span>
                                        <strong className="text-slate-900 dark:text-white block mt-1">{selectedClient.profile?.investmentLimit ? `₹${selectedClient.profile.investmentLimit.toLocaleString()}` : '—'}</strong>
                                      </div>
                                      <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-300 dark:border-white/5">
                                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] uppercase">Investment Period</span>
                                        <strong className="text-slate-900 dark:text-white block mt-1">{selectedClient.profile?.investmentPeriod ? `${selectedClient.profile.investmentPeriod} Months` : '—'}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {clientDetailsTab === 'kyc' && (
                                <div className="space-y-6">
                                  {/* Verification status and files */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">KYC Verification Status</h4>
                                    <div className="flex items-center space-x-3 text-xs mb-2">
                                      <span className="text-slate-600 dark:text-slate-400">KYC Status:</span>
                                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${selectedClient.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                        {selectedClient.status?.replace(/_/g, ' ')}
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block tracking-wider mt-4">KYC Proof Documents</span>
                                      {selectedClient.documents && selectedClient.documents.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {selectedClient.documents.map((doc: any) => (
                                            <div key={doc.id} className="p-3 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-lg flex items-center justify-between text-xs">
                                              <div>
                                                <strong className="text-slate-800 dark:text-slate-200 block font-mono">{doc.docType?.replace(/_/g, ' ')}</strong>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate max-w-[180px]">{doc.fileName}</span>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${doc.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>{doc.status}</span>
                                                <a href={`${api.getBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer" className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-primary-600 dark:text-primary-400 hover:text-slate-900 dark:text-white transition"><Eye className="h-3 w-3" /></a>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">No KYC proof documents uploaded by client.</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Agreements status */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Client Advisory Agreements</h4>
                                    {selectedClient.agreements && selectedClient.agreements.length > 0 ? (
                                      <div className="space-y-3">
                                        {selectedClient.agreements.map((agr: any) => (
                                          <div key={agr.id} className="p-3.5 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-lg flex items-center justify-between text-xs">
                                            <div className="space-y-1">
                                              <div className="flex items-center space-x-2">
                                                <strong className="text-slate-900 dark:text-white">Advisory Agreement v{agr.version}</strong>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 uppercase">{agr.status}</span>
                                              </div>
                                              <div className="text-[10px] text-slate-500 dark:text-slate-500">Signed on {new Date(agr.signedAt).toLocaleDateString('en-IN')} via {agr.esignMode}</div>
                                            </div>
                                            <a
                                              href={`${api.getBaseUrl()}${agr.agreementUrl}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition"
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                              <span>View Agreement</span>
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">No signed advisory agreement on file.</div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {clientDetailsTab === 'subscriptions' && (
                                <div className="space-y-6">
                                  {/* Segment-wise Expiry Overview */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Segment-wise Expiry Overview</h4>
                                    <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-slate-950/20">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="bg-slate-100 dark:bg-slate-950/40 border-b border-slate-300 dark:border-white/5 text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            <th className="py-2.5 px-4">Service Name</th>
                                            <th className="py-2.5 px-4 text-right">Expiry Date</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300 font-medium">
                                          {(() => {
                                            const segExpiries = calculateSegmentExpiries(selectedClient.subscriptions || []);
                                            const now = new Date();
                                            return Object.entries(segExpiries).map(([name, date]) => {
                                              const isActive = date && date > now;
                                              const isExpired = date && date <= now;
                                              return (
                                                <tr key={name} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">{name}</td>
                                                  <td className="py-2.5 px-4 text-right font-mono">
                                                    {isActive ? (
                                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                        {date!.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                      </span>
                                                    ) : isExpired ? (
                                                      <span className="text-rose-600 dark:text-rose-400 line-through opacity-60">
                                                        {date!.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Expired)
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-500 dark:text-slate-500">Not Subscribed</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            });
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Active subscriptions cards */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Active Services Overview</h4>
                                    {selectedClient.subscriptions && selectedClient.subscriptions.filter((s: any) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date()).length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedClient.subscriptions.filter((s: any) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date()).map((sub: any) => {
                                          const isCustomAmount = sub.amountTotal != null && (gstCalculationType === 'EXCLUSIVE' ? Math.abs(sub.amountTotal - Math.round((sub.plan?.price || 0) * 1.18)) > 2 : Math.abs(sub.amountTotal - (sub.plan?.price || 0)) > 2);
                                          const defaultDays = (sub.plan?.durationMonths || 1) * 30;
                                          const actualDays = Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24));
                                          const isCustomDays = Math.abs(actualDays - defaultDays) > 4;
                                          const isCustom = isCustomAmount || isCustomDays;

                                          return (
                                            <div key={sub.id} className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs space-y-2">
                                              <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-2">
                                                  <strong className="text-slate-900 dark:text-white text-sm uppercase">{sub.plan?.name}</strong>
                                                  {isCustom && <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>}
                                                </div>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold uppercase">ACTIVE</span>
                                              </div>
                                              <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                <div className="flex justify-between">
                                                  <span>Purchase Price:</span>
                                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{(sub.amountTotal ?? (gstCalculationType === 'EXCLUSIVE' ? Math.round(sub.plan?.price * 1.18) : sub.plan?.price)).toLocaleString()}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between"><span>Start Date:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(sub.startDate).toLocaleDateString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Expiry Date:</span> <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{new Date(sub.endDate).toLocaleDateString('en-IN')}</span></div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">No active subscriptions currently.</div>
                                    )}
                                  </div>

                                  {/* Full log table */}
                                  <div className="glassmorphism rounded-xl border border-slate-300 dark:border-white/5 overflow-hidden">
                                    <div className="p-4 border-b border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40">
                                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Purchase History Logs</h4>
                                    </div>
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-950/40 border-b border-slate-300 dark:border-white/5 text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                                          <th className="py-3 px-4">S.No</th>
                                          <th className="py-3 px-4">Plan Name</th>
                                          <th className="py-3 px-4">Amount</th>
                                          <th className="py-3 px-4">Start Date</th>
                                          <th className="py-3 px-4">Expiry Date</th>
                                          <th className="py-3 px-4 text-right">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-300 dark:divide-white/5 text-slate-700 dark:text-slate-300 font-medium">
                                        {selectedClient.subscriptions && selectedClient.subscriptions.length > 0 ? (
                                          selectedClient.subscriptions.map((sub: any, idx: number) => {
                                            const isCustomAmount = sub.amountTotal != null && (gstCalculationType === 'EXCLUSIVE' ? Math.abs(sub.amountTotal - Math.round((sub.plan?.price || 0) * 1.18)) > 2 : Math.abs(sub.amountTotal - (sub.plan?.price || 0)) > 2);
                                            const defaultDays = (sub.plan?.durationMonths || 1) * 30;
                                            const actualDays = Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24));
                                            const isCustomDays = Math.abs(actualDays - defaultDays) > 4;
                                            const isCustom = isCustomAmount || isCustomDays;

                                            return (
                                              <tr key={sub.id} className="hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                                <td className="py-3 px-4 text-slate-500 dark:text-slate-500">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                  <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{sub.plan?.name}</span>
                                                    {isCustom && <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>}
                                                  </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                  {gstCalculationType === 'EXCLUSIVE' ? (
                                                    <div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 leading-tight">
                                                      <div>Base: ₹{(sub.amountBase ?? sub.plan?.price)?.toLocaleString()}</div>
                                                      <div>GST: ₹{(sub.amountGst ?? Math.round((sub.plan?.price || 0) * 0.18))?.toLocaleString()}</div>
                                                      <div className="font-bold text-slate-800 dark:text-slate-200">Total: ₹{(sub.amountTotal ?? Math.round((sub.plan?.price || 0) * 1.18))?.toLocaleString()}</div>
                                                    </div>
                                                  ) : (
                                                    <div className="text-xs">
                                                      <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(sub.amountTotal ?? sub.plan?.price)?.toLocaleString()}</span>
                                                      <span className="text-[8px] text-slate-500 dark:text-slate-500 block mt-0.5">(GST Incl.)</span>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{new Date(sub.startDate).toLocaleDateString('en-IN')}</td>
                                                <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{new Date(sub.endDate).toLocaleDateString('en-IN')}</td>
                                                <td className="py-3 px-4 text-right">
                                                  {(() => {
                                                    const displayStatus = getDisplayStatus(sub);
                                                    const statusClass = displayStatus === 'ACTIVE'
                                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                      : displayStatus === 'EXPIRED'
                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-500/20';
                                                    return <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${statusClass}`}>{displayStatus}</span>;
                                                  })()}
                                                </td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={6} className="text-center py-6 text-slate-500 dark:text-slate-500">No subscriptions purchased yet.</td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {clientDetailsTab === 'communications' && (
                                <div className="space-y-4">
                                  <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Communication Logs</h4>
                                  {clientCommunications.length === 0 ? (
                                    <p className="text-xs text-slate-500">No communications found for this client.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {clientCommunications.map((log: any) => (
                                        <div key={log.id} className="p-4 rounded-xl glassmorphism border border-slate-200 dark:border-white/10 relative">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{log.title}</h5>
                                              <p className="text-xs text-slate-500 mt-1">To: {log.recipient} • {new Date(log.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                              log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              }`}>
                                              {log.status}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{log.message}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/40 flex justify-end space-x-3 text-xs">
                              {selectedClient.user?.deletedAt === null && (
                                <button
                                  onClick={() => {
                                    setIsViewClientModalOpen(false);
                                    startEditClient(selectedClient);
                                  }}
                                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-white transition"
                                >
                                  Edit Client Details
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsViewClientModalOpen(false);
                                  setSelectedClient(null);
                                }}
                                className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"
                              >
                                Close Details
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ====================================================
                PLAN MANAGEMENT TAB
               ==================================================== */}

                  {/* ====================================================
          SIGNAL MANAGEMENT TAB
         ==================================================== */}
                  {activeTab === 'research' && hasPermission('ACCESS_RESEARCH') && (
                    <SignalManagement adminPlans={adminPlans} user={user} hasPermission={hasPermission} showMobilePreview={showMobilePreview} />
                  )}

                  {/* ====================================================
          RESEARCH REPORTS TAB
         ==================================================== */}
                  {activeTab === 'research-reports' && hasPermission('ACCESS_RESEARCH') && (
                    <AdminResearchReports />
                  )}

                  {activeTab === 'plans' && (
                    <div className="space-y-6">
                      <div className="flex space-x-4 border-b border-slate-400 dark:border-white/10 pb-4">
                        <button onClick={() => setPlanManagementTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm ${planManagementTab === 'categories' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>Categories</button>
                        <button onClick={() => setPlanManagementTab('plans')} className={`px-4 py-2 rounded-lg font-bold text-sm ${planManagementTab === 'plans' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>Plans</button>
                      </div>

                      {planManagementTab === 'categories' && (
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Category Management</h2>
                            {(!isStaff || hasPermission('CREATE_PLANS')) && (
                              <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-sm flex items-center space-x-2">
                                <Plus className="h-4 w-4" /> <span>Create Category</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map(cat => (
                              <div key={cat.id} className={`p-6 rounded-2xl border ${cat.status === 'ACTIVE' ? 'bg-white dark:bg-slate-900/50 border-slate-400 dark:border-white/10' : 'bg-red-900/10 border-red-500/20'}`}>
                                <div className="flex justify-between items-start mb-4">
                                  <h3 className="text-lg font-bold">{cat.name}</h3>
                                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${cat.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>{cat.status}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Segments: {cat.segments}</p>
                                <button onClick={() => handleToggleCategoryStatus(cat.id)} className="w-full py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700">Toggle Status</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {planManagementTab === 'plans' && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-slate-300 dark:border-white/10 pb-4">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Plans</h3>
                            <div className="flex space-x-3">
                              <button onClick={() => setShowDeletedPlans(!showDeletedPlans)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border ${showDeletedPlans ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'}`}>
                                <Trash2 className="h-4 w-4" /> <span>{showDeletedPlans ? 'View Active Plans' : 'View Deleted Plans'}</span>
                              </button>
                              {(!isStaff || hasPermission('CREATE_PLANS')) && (
                                <button onClick={() => { setEditingPlan(null); setPlanName(''); setPlanDesc(''); setPlanPrice(''); setPlanDuration('1'); setPlanCategoryId(''); setIsPlanModalOpen(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2">
                                  <Plus className="h-4 w-4" /> <span>Create New Plan</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Category Filter Pills */}
                          <div className="flex space-x-3 mb-6 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <button
                              onClick={() => setSelectedCategoryFilter('ALL')}
                              className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${selectedCategoryFilter === 'ALL' ? 'bg-[#E1F13D] text-slate-950' : 'bg-transparent border border-slate-400 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}
                            >
                              All Plans
                            </button>
                            {categories.map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryFilter(cat.id)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${selectedCategoryFilter === cat.id ? 'bg-[#E1F13D] text-slate-950' : 'bg-transparent border border-slate-400 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {adminPlans.filter(plan => {
                              const isDeleted = plan.deletedAt !== null && plan.deletedAt !== undefined;
                              if (showDeletedPlans && !isDeleted) return false;
                              if (!showDeletedPlans && isDeleted) return false;
                              if (selectedCategoryFilter !== 'ALL' && plan.categoryId !== selectedCategoryFilter) return false;
                              return true;
                            }).map(plan => {
                              const isDeleted = plan.deletedAt !== null && plan.deletedAt !== undefined;
                              return (
                                <div key={plan.id} className={`p-6 rounded-2xl border ${isDeleted ? 'opacity-60 bg-slate-100 dark:bg-slate-950/40 border-rose-500/20' : plan.status === 'ACTIVE' ? 'bg-white dark:bg-slate-900/50 border-slate-400 dark:border-white/10' : 'bg-red-900/10 border-red-500/20'} flex flex-col`}>
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 tracking-wider mb-1 block">{plan.category?.name || 'UNCATEGORIZED'}</span>
                                      <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-2xl font-bold">₹{plan.price.toLocaleString()}</div>
                                      <span className="text-[9px] text-slate-500 dark:text-slate-500 block mt-0.5">
                                        {gstCalculationType === 'EXCLUSIVE' ? '+ 18% GST (Exclusive)' : '18% GST (Inclusive)'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 mb-4">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${isDeleted ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : plan.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                                      {isDeleted ? 'DELETED' : plan.status}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-4 flex-grow" dangerouslySetInnerHTML={{ __html: plan.description }} />
                                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 mb-6 bg-black/20 p-3 rounded-lg border border-slate-300 dark:border-white/5">
                                    <div className="flex justify-between"><span>Duration</span> <strong className="text-slate-900 dark:text-white">{plan.durationMonths} Month(s)</strong></div>
                                    <div className="flex justify-between"><span>Segments</span> <strong className="text-emerald-600 dark:text-emerald-400">{plan.researchSegments}</strong></div>
                                  </div>
                                  <div className="flex space-x-2 mt-auto">
                                    {!isDeleted ? (
                                      <>
                                        {(!isStaff || hasPermission('EDIT_PLANS')) && (
                                          <button onClick={() => { setEditingPlan(plan); setPlanName(plan.name); setPlanDesc(plan.description); setPlanPrice(plan.price.toString()); setPlanDuration(plan.durationMonths.toString()); setPlanCategoryId(plan.categoryId || ''); setIsPlanModalOpen(true); }} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 rounded-xl text-xs font-bold transition">
                                            <Edit2 className="h-3 w-3" /> <span>Edit</span>
                                          </button>
                                        )}
                                        {(!isStaff || hasPermission('EDIT_PLANS')) && (
                                          <button onClick={() => handleTogglePlanStatus(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 rounded-xl text-xs font-bold transition">
                                            <span>Toggle</span>
                                          </button>
                                        )}
                                        {(!isStaff || hasPermission('DELETE_PLANS')) && (
                                          <button onClick={() => handleDeletePlan(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition border border-rose-500/20">
                                            <Trash2 className="h-3 w-3" /> <span>Delete</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        {(!isStaff || hasPermission('DELETE_PLANS')) && (
                                          <button onClick={() => handleRestorePlan(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition border border-emerald-500/20">
                                            <RotateCcw className="h-3 w-3" /> <span>Restore</span>
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === 'coupons' && <CouponsManager />}

                  {activeTab === 'settings' && (
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
                          { id: 'policies', label: 'Documents & Policies', icon: FileText },
                          { id: 'billing', label: 'Banking & Invoicing', icon: Landmark },
                          { id: 'integrations', label: 'Integrations', icon: LayoutGrid }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setSettingsTab(tab.id as any)}
                            className={`flex flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${settingsTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                          >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </div>

                      {settingsTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">🏢 Company Details</h3>
                              <p className="text-xs text-slate-500 mb-6">Basic information about your firm.</p>

                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Company Logo</label>
                              <div className="flex items-start gap-6">
                                {(logoFile || appLogo) && (
                                  <div className="shrink-0 p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                                    <img src={logoFile ? URL.createObjectURL(logoFile) : appLogo} alt="Company Logo" className="h-16 w-auto object-contain max-w-[120px]" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] as any)} className="w-full max-w-md text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                  <p className="text-xs text-slate-500 mt-2">Appears on Research Reports & Invoices.</p>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-400 dark:border-white/10 pt-6">
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Signal Management Options</h3>
                              <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Show Mobile Preview</h4>
                                  <p className="text-xs text-slate-500 mt-1">Enable live mobile app preview panel when managing signals.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
                                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                                </label>
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
                                {socialMediaLinks.map((link, idx) => (
                                  <div key={idx} className="flex space-x-4 items-center">
                                    <input type="text" value={link.platform} onChange={e => {
                                      const newLinks = [...socialMediaLinks];
                                      newLinks[idx].platform = e.target.value;
                                      setSocialMediaLinks(newLinks);
                                    }} placeholder="Platform (e.g. Twitter)" className="w-1/3 bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                    <input type="url" value={link.link} onChange={e => {
                                      const newLinks = [...socialMediaLinks];
                                      newLinks[idx].link = e.target.value;
                                      setSocialMediaLinks(newLinks);
                                    }} placeholder="URL" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                    <button onClick={() => {
                                      const newLinks = [...socialMediaLinks];
                                      newLinks.splice(idx, 1);
                                      setSocialMediaLinks(newLinks);
                                    }} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === 'policies' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">📄 Documents, Policies & Onboarding</h3>
                            <p className="text-xs text-slate-500 mb-6">Manage mandatory compliance files and customer flow preferences.</p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 mb-6">
                              <label className="flex items-center space-x-3">
                                <input type="checkbox" checked={kycFirst} onChange={e => setKycFirst(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Require KYC before Payment</span>
                              </label>
                              <p className="text-xs text-slate-500 ml-8 mt-1">If unchecked, users will pay first and then do KYC.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Terms & Conditions PDF</label>
                                <input type="file" accept="application/pdf" onChange={e => setTermsPdf(e.target.files?.[0] as any)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                <p className="text-xs text-slate-500 mt-2">Sent automatically with Welcome Email.</p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Privacy Policy PDF</label>
                                <input type="file" accept="application/pdf" onChange={e => setPrivacyPdf(e.target.files?.[0] as any)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                <p className="text-xs text-slate-500 mt-2">Sent automatically with Welcome Email.</p>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/5 md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Internal Policy PDF</label>
                                <input type="file" accept="application/pdf" onChange={e => setInternalPolicyPdf(e.target.files?.[0] as any)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                                <p className="text-xs text-slate-500 mt-2">Written internal policies & controls for SEBI compliance. Not visible to clients.</p>
                              </div>
                            </div>

                            <div className="border-t border-slate-400 dark:border-white/10 pt-6 space-y-6">
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Service Agreement Content</label>
                                  <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-1 rounded">Supports Variables</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mb-2">
                                  Available variables: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{CLIENT_NAME}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{CLIENT_EMAIL}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{CLIENT_MOBILE}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{PAN_NUMBER}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{AADHAAR_NUMBER}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{CLIENT_ADDRESS}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{COMPANY_NAME}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{COMPANY_ADDRESS}}"}</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{"{{DATE}}"}</code>
                                </p>
                                <textarea
                                  value={agreementContent}
                                  onChange={e => setAgreementContent(e.target.value)}
                                  rows={6}
                                  className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs font-mono"
                                  placeholder={`Enter the Service Agreement terms here...\n\nThis agreement is made between {{COMPANY_NAME}} and {{CLIENT_NAME}}...`}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Welcome Email Custom Text</label>
                                <textarea value={welcomeEmailText} onChange={e => setWelcomeEmailText(e.target.value)} rows={3} placeholder="Add custom text to the welcome email..." className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 outline-none transition" />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Research Report Disclaimer</label>
                                <textarea value={reportDisclaimer} onChange={e => setReportDisclaimer(e.target.value)} rows={4} placeholder="Type your full research report disclaimer and disclosure here..." className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 outline-none transition" />
                                <p className="text-xs text-slate-500 mt-1">This text will automatically appear at the bottom of generated PDF Research Reports.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === 'billing' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">💳 GST & Tax Calculation</h3>
                            <p className="text-xs text-slate-500 mb-6">Manage how taxes apply to your clients.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">GST Calculation Method</label>
                                <select value={gstCalculationType} onChange={e => setGstCalculationType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition">
                                  <option value="EXCLUSIVE">Amount + GST (Exclusive)</option>
                                  <option value="INCLUSIVE">Amount Including GST (Inclusive)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Company GSTIN Number</label>
                                <input type="text" value={orgGst} onChange={e => setOrgGst(e.target.value)} placeholder="e.g. 22AAAAA1111A1Z1" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition uppercase" />
                                <p className="text-[10px] text-slate-500 mt-1">Leave empty if not applicable.</p>
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
                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch</label>
                                <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Name</label>
                                <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                                <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Type</label>
                                <input type="text" value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">IFSC Code</label>
                                <input type="text" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === 'integrations' && (
                        <div className="space-y-6 animate-fade-in">
                          {/* Integration Sub-tabs */}
                          <div className="flex flex-wrap items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full mb-2">
                            {[
                              { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
                              { id: 'email', label: 'Email & SMTP', icon: User },
                              { id: 'kyc', label: 'Digio KYC & eSign', icon: FileCheck }
                            ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => setIntegrationTab(tab.id as any)}
                                className={`flex flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${integrationTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                              >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Payment Gateways */}
                          {integrationTab === 'payments' && (
                            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in">
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">💳 Payment Gateways</h3>
                              <p className="text-xs text-slate-500 mb-4">Configure your payment gateway integration here.</p>
                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Active Payment Gateway</label>
                                <select value={activePaymentGateway} onChange={e => setActivePaymentGateway(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition">
                                  <option value="RAZORPAY">Razorpay</option>
                                  <option value="CASHFREE">Cashfree</option>
                                  <option value="CCAVENUE">CCAvenue</option>
                                  <option value="STRIPE">Stripe</option>
                                </select>
                              </div>

                              {activePaymentGateway === 'RAZORPAY' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Razorpay Key ID</label>
                                    <input type="text" value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Razorpay Key Secret</label>
                                    <input type="password" value={razorpayKeySecret} onChange={e => setRazorpayKeySecret(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                </div>
                              )}

                              {activePaymentGateway === 'CASHFREE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cashfree App ID</label>
                                    <input type="text" value={cashfreeAppId} onChange={e => setCashfreeAppId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cashfree Secret Key</label>
                                    <input type="password" value={cashfreeSecretKey} onChange={e => setCashfreeSecretKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                </div>
                              )}

                              {activePaymentGateway === 'CCAVENUE' && (
                                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Merchant ID</label>
                                    <input type="text" value={ccavenueMerchantId} onChange={e => setCcavenueMerchantId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Access Code</label>
                                    <input type="text" value={ccavenueAccessCode} onChange={e => setCcavenueAccessCode(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Working Key</label>
                                    <input type="password" value={ccavenueWorkingKey} onChange={e => setCcavenueWorkingKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                </div>
                              )}

                              {activePaymentGateway === 'STRIPE' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Stripe Publishable Key</label>
                                    <input type="text" value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Stripe Secret Key</label>
                                    <input type="password" value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Email & SMTP Configuration */}
                          {integrationTab === 'email' && (
                            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in">
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">📧 Email & SMTP Configuration</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Configure your own email server to send welcome emails and password reset links to your users.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">SMTP Host</label>
                                  <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. smtp.gmail.com" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">SMTP Port</label>
                                  <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. 587 or 465" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Username (Email)</label>
                                  <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. you@gmail.com" />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Password (App Password)</label>
                                  <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="Enter password to update" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Digio KYC */}
                          {integrationTab === 'kyc' && (
                            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in">
                              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Digio KYC & eSign Configuration</h3>
                              <p className="text-xs text-slate-500 mb-4">Configure your Digio credentials to enable Aadhaar KYC and Agreement eSigning for your clients.</p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio Client ID</label>
                                  <input type="text" value={digioClientId} onChange={e => setDigioClientId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. DID123XYZ..." />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio Client Secret</label>
                                  <input type="password" value={digioClientSecret} onChange={e => setDigioClientSecret(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="Leave blank to keep unchanged" />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio KYC Template Name</label>
                                  <input type="text" value={digioKycTemplateName} onChange={e => setDigioKycTemplateName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. KYC_TEMPLATE_1" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}


                      {/* Save Settings Footer */}
                      <div className="mt-8 p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200/20 dark:shadow-none animate-fade-in">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200">Save Your Changes</h4>
                          <p className="text-xs text-slate-500 mt-1">Make sure to save your settings before leaving this page.</p>
                        </div>
                        <button onClick={handleSaveSettings} className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center">
                          <Save className="h-5 w-5 mr-2" /> Save Settings
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab.startsWith('customPages') && <PagesManagement readOnly={isStaff} pageSlug={activeTab.split('_')[1]} onPagesUpdate={(pages: any[]) => setAdminPagesList(pages)} />}
                  {activeTab === 'complaintReport' && <ComplaintReportAdmin />}

                  {activeTab === 'signature_settings' && (
                    <div className="max-w-4xl mx-auto space-y-6 pb-20">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Settings className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Settings</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Configure your UI preferences and signature</p>
                        </div>
                      </div>

                      {/* UI Preferences Section */}
                      <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6">
                        <h3 className="text-lg font-bold mb-4">UI Preferences</h3>
                        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <div>
                            <h4 className="font-bold text-sm">Show Mobile Preview in Signal Desk</h4>
                            <p className="text-xs text-slate-500 mt-1">Enable or disable the right-side mobile app preview panel when managing signals.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Signature Section */}
                      {(user?.role === 'RESEARCHER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6">
                          <h3 className="text-lg font-bold mb-4">Research Analyst Signature</h3>
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-4 rounded-xl mb-6 flex items-start space-x-3">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-sm">Why is this required?</h4>
                              <p className="text-xs mt-1 leading-relaxed">
                                As per SEBI guidelines, every Research Report generated must bear the signature of the responsible Research Analyst.
                                When you upload your signature here, it will be securely saved and automatically appended to the footer of all PDF
                                Research Reports generated from the Signal Management desk.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {user?.tenant?.coSignatureUrl && (
                              <div className="mb-4 p-4 bg-slate-50 dark:bg-[#1A2235] rounded-xl border border-slate-200 dark:border-white/10 inline-block">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase">Current Signature</p>
                                <img
                                  src={user.tenant.coSignatureUrl.startsWith('http') ? user.tenant.coSignatureUrl : `${api.getBaseUrl()}${user.tenant.coSignatureUrl}`}
                                  alt="Current Signature"
                                  className="h-20 object-contain mix-blend-multiply dark:mix-blend-normal bg-white"
                                />
                              </div>
                            )}
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Upload Your Signature</label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Accepted formats: PNG, JPG, JPEG (Max 2MB). A clear signature on a white background is recommended.</p>

                            <div className="mt-2">
                              <input
                                type="file"
                                id="coSignatureUploadSettings"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  if (window.confirm("Notice: This signature will be applied to all your generated PDF Research Reports. Do you want to proceed?")) {
                                    handleUploadCoSignature(e);
                                  } else {
                                    e.target.value = '';
                                  }
                                }}
                                disabled={uploadingCoSignature}
                              />
                              <label
                                htmlFor="coSignatureUploadSettings"
                                className={`inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer ${uploadingCoSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {uploadingCoSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                <span>Select & Upload Signature File</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'resources' && (
                    <div className="animate-fade-in">
                      <AdminResourcesTab triggerAlert={(msg) => toast(msg)} />
                    </div>
                  )}

                  {/* ROLES TAB */}
                  {activeTab === 'tickets' && hasPermission('ACCESS_TICKETS') && (
                    <TicketManagement
                      adminTickets={adminTickets}
                      fetchAdminTickets={async () => {
                        const listRes = await api.listAdminTickets();
                        if (listRes.success) setAdminTickets(listRes.data);
                      }}
                      adminTicketStatusFilter={adminTicketStatusFilter}
                      setAdminTicketStatusFilter={setAdminTicketStatusFilter}
                    />
                  )}
                  {activeTab === 'roles' && hasPermission('ACCESS_ROLES') && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">Access Control & Role Permissions</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Configure permission access matrices for default and custom roles in the platform</p>
                        </div>
                        {hasPermission('ACCESS_ROLES') && (
                          <button
                            onClick={() => {
                              setNewRoleName('');
                              setNewRoleDesc('');
                              setIsRoleModalOpen(true);
                            }}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-lg shadow-primary-500/20 shrink-0"
                          >
                            <Plus className="h-4 w-4 mr-1.5" /> Create Custom Role
                          </button>
                        )}
                      </div>

                      <div className="space-y-6">
                        {/* Horizontal Roles List (Carousel) */}
                        <div className="bg-white dark:bg-[#0F172A] p-3 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-center relative group">
                          {/* Carousel Prev Button */}
                          <button
                            onClick={() => {
                              if (rolesScrollRef.current) {
                                rolesScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                              }
                            }}
                            className="absolute left-2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-400 hover:text-primary-600 transition opacity-0 group-hover:opacity-100 hidden md:block"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>

                          <div
                            ref={rolesScrollRef}
                            className="flex gap-3 px-2 md:px-10 pb-1 pt-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth w-full"
                          >
                            {roles.filter((r: any) => !(user?.role === 'ADMIN' && r.name === 'SUPER_ADMIN')).map((r: any) => {
                              const isSelected = selectedRole?.id === r.id;
                              const isSystemRole = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'].includes(r.name);
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => setSelectedRole(r)}
                                  className={`shrink-0 text-left px-4 py-3 rounded-xl border transition-all duration-200 flex flex-col w-[200px] ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-500/50 ring-1 ring-primary-500/20 shadow-sm' : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:border-primary-500/30 hover:bg-white dark:hover:bg-slate-800/50'}`}
                                >
                                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-wide font-mono uppercase truncate w-full mb-2">
                                    {r.name.replace(/_/g, ' ')}
                                  </span>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center text-[10px] text-slate-500 dark:text-slate-500 font-mono">
                                      <ShieldCheck className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-400" />
                                      <span>{r.permissions?.length || 0} perms</span>
                                    </div>
                                    {isSystemRole ? (
                                      <span className="text-[9px] bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">System</span>
                                    ) : (
                                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono shrink-0">Custom</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Carousel Next Button */}
                          <button
                            onClick={() => {
                              if (rolesScrollRef.current) {
                                rolesScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                              }
                            }}
                            className="absolute right-2 z-10 p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md text-slate-600 dark:text-slate-400 hover:text-primary-600 transition opacity-0 group-hover:opacity-100 hidden md:block"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Permissions Configuration (Full Width Below) */}
                        <div className="w-full space-y-6">
                          {!selectedRole ? (
                            <div className="bg-white dark:bg-[#0F172A] p-12 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none text-center flex flex-col items-center justify-center space-y-4">
                              <ShieldCheck className="h-16 w-16 text-slate-400 dark:text-slate-600 animate-pulse" />
                              <div>
                                <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">Select a Role</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm">Choose a system or custom role from the left panel to configure its access controls and dashboard page visibility.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                              <div className="pb-5 border-b border-slate-200 dark:border-slate-800/60 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-bold font-mono tracking-wide">{selectedRole.name.replace(/_/g, ' ')}</h3>
                                    <span className="px-2 py-0.5 rounded bg-primary-500/15 border border-primary-500/30 text-[10px] font-bold text-primary-600 dark:text-primary-400">Permissions Matrix</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{selectedRole.description || 'Manage user portal access controls.'}</p>
                                </div>

                                {['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) ? (
                                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 max-w-xs text-[11px] text-amber-700 dark:text-amber-300">
                                    <strong>Read-Only Access:</strong> Admin and Super Admin roles hold absolute permissions which cannot be disabled.
                                  </div>
                                ) : !['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'].includes(selectedRole.name) && (
                                  <div className="flex flex-col items-end space-y-1 bg-slate-100 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-300 dark:border-white/5">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => {
                                          setEditRoleId(selectedRole.id);
                                          setEditRoleName(selectedRole.name);
                                          setEditRoleDesc(selectedRole.description || '');
                                          setIsEditRoleModalOpen(true);
                                        }}
                                        disabled={selectedRole.isAssigned}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={selectedRole.isAssigned ? "This role is currently assigned to users and cannot be modified." : "Edit this custom role's name and description"}
                                      >
                                        <Edit2 className="h-3 w-3 mr-1" /> Edit Role
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRole(selectedRole.id)}
                                        disabled={selectedRole.isAssigned}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-400 hover:text-slate-900 dark:text-white hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={selectedRole.isAssigned ? "This role is currently assigned to users and cannot be deleted." : "Delete this custom role"}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" /> Delete Role
                                      </button>
                                    </div>
                                    {selectedRole.isAssigned && (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                        Cannot edit/delete: Assigned to staff
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Login Device Constraint */}
                              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                                <div className="border-b border-slate-200 dark:border-slate-800/60 pb-3">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary-600 dark:text-primary-400">Login Settings</h4>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Configure device login constraints for this role.</p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="pr-4">
                                    <p className="text-sm font-semibold">Allow Multi-Device Login</p>
                                    <p className="text-xs text-slate-500">If disabled, users can only log in from one device at a time. New logins will automatically log out older sessions.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={!!selectedRole.allowMultiDeviceLogin}
                                      onChange={(e) => {
                                        const newValue = e.target.checked;
                                        triggerConfirm({
                                          title: 'Update Login Constraint',
                                          message: `Are you sure you want to set the login constraint for ${selectedRole.name} to ${newValue ? 'Multi-Device' : 'Single-Device'}?`,
                                          variant: 'warning',
                                          confirmLabel: 'Yes, Update',
                                          cancelLabel: 'Cancel',
                                          onConfirm: async () => {
                                            const prevValue = selectedRole.allowMultiDeviceLogin;
                                            setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: newValue });

                                            try {
                                              const res = await api.updateRole(selectedRole.id, { allowMultiDeviceLogin: newValue });
                                              if (res.success) {
                                                const rReq = await api.getRoles();
                                                if (rReq.success) {
                                                  setRoles(rReq.data);
                                                  const updated = rReq.data.find((r: any) => r.id === selectedRole.id);
                                                  if (updated) setSelectedRole(updated);
                                                }
                                                if (user?.role === selectedRole.name) {
                                                  const updatedUser = { ...user, allowMultiDeviceLogin: newValue };
                                                  setUser(updatedUser);
                                                  localStorage.setItem('user', JSON.stringify(updatedUser));
                                                }
                                              } else {
                                                setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: prevValue });
                                              }
                                            } catch (err: any) {
                                              setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: prevValue });
                                            }
                                          }
                                        });
                                      }}
                                    />
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500"></div>
                                  </label>
                                </div>
                              </div>

                              {/* AUTO-GENERATED from NAV_CONFIG — add new modules in NAV_CONFIG at the top of this file */}
                              <div className="space-y-4">
                                {NAV_CONFIG.map(mod => {
                                  const hasSub = mod.subPermissions && mod.subPermissions.length > 0;
                                  return (
                                    <div key={mod.tab} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                                      <div className={`flex flex-col lg:flex-row lg:items-start justify-between gap-5 ${hasSub ? 'border-b border-slate-200 dark:border-slate-800/60 pb-5 mb-5' : ''}`}>
                                        <div className="flex-1 pr-4">
                                          <div className="flex items-center space-x-2">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{mod.moduleLabel}</h4>
                                          </div>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">{mod.moduleDesc}</p>
                                        </div>
                                        <div className="shrink-0 w-full lg:w-72">
                                          {renderPermissionCheckbox(mod.accessKey, 'Enable Module', 'Toggle access to this entire tab')}
                                        </div>
                                      </div>

                                      {hasSub && (
                                        <div className="space-y-3">
                                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Granular Permissions (Module Actions)</h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#0F172A] p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                            {mod.subPermissions!
                                              .filter(sp => {
                                                if (sp.code === 'ADD_RESEARCH' && selectedRole?.permissions?.includes('OWN_RESEARCH')) return false;
                                                if (sp.code === 'OWN_RESEARCH' && selectedRole?.permissions?.includes('ADD_RESEARCH')) return false;
                                                if (sp.code === 'VIEW_ALL_TICKETS' && selectedRole?.permissions?.includes('VIEW_OWN_TICKETS')) return false;
                                                if (sp.code === 'VIEW_OWN_TICKETS' && selectedRole?.permissions?.includes('VIEW_ALL_TICKETS')) return false;
                                                return true;
                                              })
                                              .map(sp => (
                                                renderPermissionCheckbox(sp.code, sp.label, sp.desc, mod.accessKey)
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {!['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) && (
                                <div className="pt-4 border-t border-slate-300 dark:border-white/5 flex justify-end">
                                  <button
                                    onClick={handleSavePermissions}
                                    disabled={savingPermissions}
                                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs transition flex items-center disabled:opacity-50"
                                  >
                                    {savingPermissions ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Saving...
                                      </>
                                    ) : (
                                      'Save Access Permissions'
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plan Modal */}
              {isPlanModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                      <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                      <form id="planForm" onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const payload = { categoryId: planCategoryId, name: planName, description: planDesc, price: planPrice, durationMonths: planDuration };
                          const res = editingPlan ? await api.updatePlan(editingPlan.id, payload) : await api.createPlan(payload);
                          if (res.success) { setIsPlanModalOpen(false); loadData(); }
                          else { toast(res.message); }
                        } catch (err: any) { toast(err.message); }
                      }} className="space-y-5">

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Plan Category</label>
                          <select value={planCategoryId} onChange={e => setPlanCategoryId(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm">
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.segments})</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Plan Name</label>
                            <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. VIP EQUITY" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Price (₹)</label>
                            <input type="number" value={planPrice} onChange={e => setPlanPrice(e.target.value)} required min="1" className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. 15000" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Duration / Validity</label>
                          <select value={planDuration} onChange={e => setPlanDuration(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm">
                            {[1, 2, 3, 6, 12].map(m => <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <div className="text-black bg-white rounded-xl overflow-hidden">
                            {ClassicEditor && (
                              <CKEditor
                                editor={ClassicEditor as any}
                                data={planDesc}
                                onChange={(event: any, editor: any) => {
                                  const data = editor.getData();
                                  setPlanDesc(data);
                                }}
                              />
                            )}
                          </div>
                        </div>

                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsPlanModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="planForm" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20">{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Modal */}
              {isCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Create Category</h3>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="p-6">
                      <form id="catForm" onSubmit={handleCreateCategory} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Category Name</label>
                          <input type="text" value={catName} onChange={e => setCatName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Equity Premium" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Segments</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['CASH', 'FUTURE', 'OPTION', 'COMMODITY'].map(seg => (
                              <label key={seg} className="flex items-center space-x-2 text-sm bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                <input type="checkbox" checked={catSegments.includes(seg)} onChange={e => {
                                  if (e.target.checked) setCatSegments([...catSegments, seg]);
                                  else setCatSegments(catSegments.filter(s => s !== seg));
                                }} className="rounded bg-white dark:bg-slate-900 border-slate-400 dark:border-white/10 text-primary-600 dark:text-primary-500" />
                                <span>{seg}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="catForm" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20">Create Category</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Create Role Modal */}
              {isRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Create Custom Role</h3>
                      <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="p-6">
                      <form id="roleForm" onSubmit={handleCreateRole} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role Name</label>
                          <input
                            type="text"
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            required
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm"
                            placeholder="e.g. Sales Executive"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">Name will automatically convert to UPPERCASE format (e.g. SALES_EXECUTIVE).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <textarea
                            value={newRoleDesc}
                            onChange={e => setNewRoleDesc(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm min-h-[80px]"
                            placeholder="Describe role responsibilities..."
                          />
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsRoleModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="roleForm" disabled={roleModalLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {roleModalLoading ? 'Creating...' : 'Create Role'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Role Modal */}
              {isEditRoleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Edit Custom Role</h3>
                      <button onClick={() => setIsEditRoleModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="p-6">
                      <form id="editRoleForm" onSubmit={handleEditRole} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role Name</label>
                          <input
                            type="text"
                            value={editRoleName}
                            onChange={e => setEditRoleName(e.target.value)}
                            required
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm"
                            placeholder="e.g. Sales Executive"
                          />
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">Name will automatically convert to UPPERCASE format (e.g. SALES_EXECUTIVE).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <textarea
                            value={editRoleDesc}
                            onChange={e => setEditRoleDesc(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm min-h-[80px]"
                            placeholder="Describe role responsibilities..."
                          />
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsEditRoleModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="editRoleForm" disabled={editRoleModalLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {editRoleModalLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Details Modal */}
              {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in text-left">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile Details</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Logged in as {user.firstName} {user.lastName || ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsProfileModalOpen(false)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                      {/* Personal Details Section */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-1">Personal Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block mb-1">Full Name</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.firstName} {user.lastName || ''}</strong>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block mb-1">Email Address</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.email}</strong>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block mb-1">Mobile Number</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.mobile || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400 block mb-1">Assigned Role</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{user.role}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Staff Details Section (only if Staff user) */}
                      {user.staff && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-1">Staff Certificate & Role Info</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Employee ID</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{user.staff.employeeId || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">NISM Cert Number</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.staff.nismNumber || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">NISM Validity</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm">
                                {user.staff.nismValidity ? new Date(user.staff.nismValidity).toLocaleDateString() : 'N/A'}
                              </strong>
                            </div>
                            {user.staff.personAssociated && (
                              <>
                                <div>
                                  <span className="text-slate-600 dark:text-slate-400 block mb-1">Associated Role Type</span>
                                  <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.staff.personAssociated.roleType}</strong>
                                </div>
                                {user.staff.personAssociated.roleType === 'OTHER' && (
                                  <div>
                                    <span className="text-slate-600 dark:text-slate-400 block mb-1">Custom Role Name</span>
                                    <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.staff.personAssociated.customRole || 'N/A'}</strong>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tenant Advisor Company Details Section (if Admin user) */}
                      {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && user.tenant && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-1">Advisor Company Details</h4>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Company Name</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.tenant.companyName || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">SEBI Reg Number</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{user.tenant.sebiRegistration || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">BSE Enrollment</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{user.tenant.bseEnrollment || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">PAN Number</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{user.tenant.pan || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">GSTIN Number</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono">{user.tenant.gst || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Company Mobile</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm">{user.tenant.mobile || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Corporate Address</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm block max-w-[200px] break-words">{user.tenant.address || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Official Website</span>
                              <strong className="text-slate-800 dark:text-slate-200 text-sm truncate block">{user.tenant.website || 'N/A'}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end">
                      <button
                        onClick={() => setIsProfileModalOpen(false)}
                        className="px-6 py-2 bg-slate-100 dark:bg-white/5 border border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:text-white rounded-xl text-xs font-bold transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIT UPDATE MODAL (Compliance Officer only) */}
              {auditModalReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white dark:bg-[#0f1523] border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-slate-300 dark:border-white/5">
                      <h3 className="font-bold text-slate-900 dark:text-white">Update Compliance Status</h3>
                      <button onClick={() => setAuditModalReq(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="h-5 w-5" /></button>
                    </div>
                    <form onSubmit={handleAuditUpdate} className="p-5 space-y-4">
                      <div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Requirement</p>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{auditModalReq.requirement}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Compliance Status *</label>
                        <select value={auditStatus} onChange={e => setAuditStatus(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white">
                          <option value="">Select status...</option>
                          <option value="COMPLIANT">Compliant</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Officer Remarks</label>
                        <textarea value={auditRemarks} onChange={e => setAuditRemarks(e.target.value)} rows={3} placeholder="Add observations or notes..." className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Upload Compliance Document (optional)</label>
                        <input type="file" accept=".pdf,.jpg,.png" onChange={e => setAuditProof(e.target.files?.[0] || null)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white" />
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setAuditModalReq(null)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 rounded-xl transition">Cancel</button>
                        <button type="submit" disabled={resolveLoading} className="px-5 py-2 text-xs font-bold bg-primary-600 hover:bg-primary-500 rounded-xl transition disabled:opacity-50">
                          {resolveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Status'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* PENALTY RESOLVE MODAL (Compliance Officer only) */}
              {penaltyResolveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white dark:bg-[#0f1523] border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-slate-300 dark:border-white/5">
                      <h3 className="font-bold text-slate-900 dark:text-white">Resolve Penalty</h3>
                      <button onClick={() => setPenaltyResolveId(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="h-5 w-5" /></button>
                    </div>
                    <form onSubmit={handlePenaltyResolve} className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Resolution Type *</label>
                        <select value={penaltyResolutionType} onChange={e => setPenaltyResolutionType(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white">
                          <option value="" disabled>Select Resolution Type</option>
                          <option value="Compliant">Compliant</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                      {penaltyResolutionType === 'Paid' && (
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Payment / Transaction Reference *</label>
                          <input type="text" value={penaltyPayRef} onChange={e => setPenaltyPayRef(e.target.value)} required placeholder="e.g. UTR123456789" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">{penaltyResolutionType === 'Paid' ? 'Upload Payment Receipt (Screenshot) *' : 'Upload Proof Document *'}</label>
                        <input type="file" accept=".pdf,.jpg,.png" onChange={e => setPenaltyProof(e.target.files?.[0] || null)} required className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Remarks *</label>
                        <textarea value={penaltyRemarks} onChange={e => setPenaltyRemarks(e.target.value)} required rows={2} placeholder={penaltyResolutionType === 'Paid' ? "Enter payment details..." : "Enter compliance remarks..."} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white resize-none" />
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => { setPenaltyResolveId(null); setPenaltyResolutionType(''); }} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 rounded-xl transition">Cancel</button>
                        <button type="submit" disabled={resolveLoading} className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded-xl transition disabled:opacity-50">
                          {resolveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Resolution'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* COMPLAINT RESOLVE MODAL — Upload ATR proof */}
              {complaintResolveId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-white dark:bg-[#0f1523] border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-slate-300 dark:border-white/5">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Resolve Complaint</h3>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Upload ATR (Action Taken Report) to close this complaint</p>
                      </div>
                      <button onClick={() => setComplaintResolveId(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white"><X className="h-5 w-5" /></button>
                    </div>
                    <form onSubmit={handleComplaintResolve} className="p-5 space-y-4">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">⚠️ Both ATR document and Remarks are mandatory to close a complaint.</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">ATR Proof Document (PDF / Image) *</label>
                        <div className="border border-dashed border-slate-400 dark:border-white/15 rounded-xl p-4 text-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 transition relative">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => { const files = e.target.files; setComplaintAtrProof(files ? files[0] : null); }}
                            required
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <UploadCloud className="h-5 w-5 text-primary-600 dark:text-primary-400 mx-auto mb-1" />
                          <span className="text-[10px] text-slate-700 dark:text-slate-300 block">
                            {complaintAtrProof ? complaintAtrProof.name : 'Click or drag ATR proof here (PDF, JPG, PNG)'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Action Taken Remarks *</label>
                        <textarea
                          value={complaintAtrRemarks}
                          onChange={e => setComplaintAtrRemarks(e.target.value)}
                          required
                          rows={3}
                          placeholder="Describe the action taken to resolve this complaint..."
                          className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white resize-none"
                        />
                      </div>
                      <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={() => setComplaintResolveId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 rounded-xl transition">Cancel</button>
                        <button type="submit" disabled={complaintResolveLoading} className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded-xl transition disabled:opacity-50 flex items-center space-x-2">
                          {complaintResolveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>Submit ATR & Close</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* NON-ADMIN CLIENT VIEWS */}
              {activeTab === 'complaintDataView' && (
                <CustomPageView page={{ slug: 'complaint-status', title: 'Complaint Data' }} />
              )}
              {activeTab === 'legalView' && (
                <Legal
                  pages={adminPagesList.filter((page: any) => page.slug !== 'complaint-status' && (page.status === 'ACTIVE' || !page.status))}
                  onReadDocument={(page: any) => {
                    if (page.type === 'URL' && page.externalUrl) {
                      window.open(page.externalUrl, '_blank');
                    } else {
                      setActiveTab(`customPages_${page.slug}`);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </main>

        {closingAlertId && (() => {
          const activeClosingAlert = alerts.find((a: any) => a.id === closingAlertId);
          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Resolve Compliance Alert</h3>
                <form onSubmit={handleCloseAlert} className="space-y-4">
                  {activeClosingAlert?.alertType === 'DEPOSIT_LOW' && (
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Add deposit Float (Rs.)</label>
                      <input type="number" value={depositTopup} onChange={e => setDepositTopup(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      {activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Upload Payment Receipt (Optional)' : 'Upload Proof Document (Optional)'}
                    </label>
                    <input
                      type="file"
                      onChange={e => setAlertProof(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 dark:bg-white/10 file:text-slate-900 dark:text-white hover:file:bg-slate-300 dark:bg-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      {activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Proof remarks / Date' : 'Resolution Remarks'}
                    </label>
                    <textarea
                      value={closeRemarks}
                      onChange={e => setCloseRemarks(e.target.value)}
                      required
                      rows={3}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs"
                      placeholder={activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Enter bank receipt reference details...' : 'Enter details about how this alert was resolved...'}
                    />
                  </div>
                  <div className="flex space-x-3 pt-2 justify-end text-xs">
                    <button type="button" onClick={() => setClosingAlertId(null)} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold">Submit & Close Alert</button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
        />

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center"><FileText className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" /> Download Periodic Report</h3>
                <button onClick={() => setShowReportModal(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleDownloadPeriodicReport}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Financial Year (Starting April)</label>
                    <select
                      value={reportYear}
                      onChange={e => setReportYear(parseInt(e.target.value))}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-900 dark:text-white"
                    >
                      {(() => {
                        const now = new Date();
                        const currentFinYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                        const numYears = Math.max(1, currentFinYear - reportStartYear + 1);
                        return [...Array(numYears)].map((_, i) => {
                          const year = reportStartYear + i;
                          return <option key={year} value={year}>{year} - {year + 1}</option>
                        });
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reporting Period</label>
                    <select
                      value={reportHalf}
                      onChange={e => setReportHalf(e.target.value as 'H1' | 'H2')}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="H1">H1 (April - September)</option>
                      <option value="H2">H2 (October - March)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      <strong>Disclaimer:</strong> The data populated in this report is retrieved directly from the administrative database settings. Please ensure that you thoroughly review and manually verify all details in the generated Excel file before final submission to SEBI.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start space-x-2 px-1">
                  <input
                    type="checkbox"
                    id="agreeDisclaimer"
                    required
                    className="mt-1 h-4 w-4 rounded border-slate-400 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="agreeDisclaimer" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    I acknowledge the disclaimer and agree to manually verify the downloaded data before submission.
                  </label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 text-sm transition">Cancel</button>
                  <button type="submit" disabled={downloadingReport} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition flex items-center space-x-2 disabled:opacity-50">
                    {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>Agree & Download</span>
                  </button>
                </div>
              </form>
           
          </div>

          </div>
        )}

        {/* Complaint Modal */}
        {isComplaintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 my-8 animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Log Complaint</h3>
                <button onClick={() => setIsComplaintModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleCreateComplaint} className="space-y-4">
                {/* Client DB Search / Auto-fill Section */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Search Client Record (PAN / Aadhaar / Email / Mobile / Name)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={complaintSearchQuery}
                      onChange={(e) => {
                        setComplaintSearchQuery(e.target.value);
                        if (showClientNotFoundAlert) setShowClientNotFoundAlert(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchClientForComplaint();
                        }
                      }}
                      placeholder="Type Client PAN, Aadhaar, Mobile, Email or Name..."
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSearchClientForComplaint()}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs flex items-center transition shadow-md shadow-primary-500/20"
                    >
                      <Search className="h-4 w-4 mr-1.5" /> Search DB
                    </button>
                  </div>

                  {/* Found Client Banner */}
                  {complaintFoundClient && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span>
                          <strong>Client Found:</strong> {complaintClientName} {complaintPan ? `(PAN: ${complaintPan})` : ''} {complaintMobile ? `(Mob: ${complaintMobile})` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setComplaintFoundClient(null);
                          setComplaintSearchQuery('');
                          setComplaintClientName('');
                          setComplaintEmail('');
                          setComplaintMobile('');
                          setComplaintPan('');
                        }}
                        className="text-emerald-500 underline font-bold hover:text-emerald-400 ml-2"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Not Found Alert */}
                  {showClientNotFoundAlert && !complaintFoundClient && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-1">
                          <h5 className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">Client Not Found in Database</h5>
                          <p className="text-slate-600 dark:text-slate-300">
                            यह क्लाइंट आपके रिकॉर्ड में नहीं है। क्या आप न्यू क्लाइंट डिटेल्स मैनुअली दर्ज करना चाहते हैं?
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualFillAllowed(true);
                            setShowClientNotFoundAlert(false);
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition"
                        >
                          Yes, Fill Details Manually
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setComplaintSearchQuery('');
                            setShowClientNotFoundAlert(false);
                          }}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                        >
                          No, Search Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!complaintFoundClient && !isManualFillAllowed && !showClientNotFoundAlert && (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl space-y-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">🔍 Client Search Required</p>
                    <p className="text-xs text-slate-500">Please enter Client PAN, Aadhaar, Mobile, Email or Name above and click <strong className="text-primary-600">Search DB</strong> to look up client or fill complaint details.</p>
                  </div>
                )}

                {(complaintFoundClient || isManualFillAllowed) && (
                  <div className="space-y-4 animate-fade-in pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Name *</label>
                        <input type="text" required value={complaintClientName} onChange={(e) => setComplaintClientName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="E.g. Rahul Kumar" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Source *</label>
                        <select required value={complaintSource} onChange={(e) => setComplaintSource(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500">
                          <option value="MANUAL">Manual</option>
                          <option value="SCORES">SCORES</option>
                          <option value="EMAIL">Email</option>
                          <option value="PORTAL">Portal</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Email</label>
                        <input type="email" value={complaintEmail} onChange={(e) => setComplaintEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Mobile</label>
                        <input type="text" value={complaintMobile} onChange={(e) => setComplaintMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client PAN</label>
                        <input type="text" value={complaintPan} onChange={(e) => setComplaintPan(formatPan(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Received At</label>
                        <input type="date" value={complaintReceivedAt} onChange={(e) => setComplaintReceivedAt(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Subject *</label>
                        <input type="text" required value={complaintSubject} onChange={(e) => setComplaintSubject(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="Short description of the issue" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Detailed Description *</label>
                      <textarea required rows={4} value={complaintDescription} onChange={(e) => setComplaintDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="Provide full details of the complaint..."></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/10">
                      <button type="button" onClick={() => setIsComplaintModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                      <button type="submit" disabled={isSubmittingComplaint} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors flex items-center shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {isSubmittingComplaint ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Submit Complaint
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Logout Modal */}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
              <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-center mb-2">Sign Out</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-6">Are you sure you want to sign out of your account?</p>
              {user?.allowMultiDeviceLogin ? (
                <div className="flex flex-col space-y-3">
                  <button onClick={() => handleLogout(false)} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Sign out on this device</button>
                  <button onClick={() => handleLogout(true)} className="w-full py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-500 hover:bg-rose-900/40 text-sm font-bold rounded-xl transition-colors">Sign out on ALL devices</button>
                  <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 mt-2">Cancel</button>
                </div>
              ) : (
                <div className="flex justify-center space-x-3">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                  <button onClick={() => handleLogout(false)} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Log Out</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(AdminDashboardContent), { ssr: false });


