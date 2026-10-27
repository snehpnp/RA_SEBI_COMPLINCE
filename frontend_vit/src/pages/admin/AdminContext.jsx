import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from '@/utils/nextCompat';
import { useBranding } from '@/contexts/BrandingContext';
import { useStates } from '@/hooks/useStates';
import { useCities } from '@/hooks/useCities';
import { usePagination } from '@/hooks/usePagination';
import { generatePeriodicReport } from '@/utils/generatePeriodicReport';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { base_ra_url } from '@/utils/config';
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

const AdminContext = createContext(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
};
const formatAlertDescription = (description) => {
    if (!description)
        return null;
    const highlightRegex = /(\(Expiry Date: \d{2}\/\d{2}\/\d{4}\)|\(valid until: [^\)]+\)|\d+ day\(s\)|\d+ days)/gi;
    const tokens = description.split(highlightRegex);
    return tokens.map((token, i) => {
        if (token.match(/\(Expiry Date: \d{2}\/\d{2}\/\d{4}\)/i) || token.match(/\(valid until: [^\)]+\)/i)) {
            return (<span key={i} className="font-extrabold text-slate-900 dark:text-white bg-slate-300 dark:bg-white/20 px-2 py-0.5 rounded border border-slate-400 dark:border-white/30 shadow-md inline-block my-1 font-mono">
          {token}
        </span>);
        }
        else if (token.match(/\d+ day\(s\)/i) || token.match(/\d+ days/i)) {
            return (<strong key={i} className="text-slate-900 dark:text-white font-extrabold underline decoration-white/40 decoration-2">
          {token}
        </strong>);
        }
        return <span key={i}>{token}</span>;
    });
};
const NAV_CONFIG = [
    {
        tab: 'dashboard',
        label: 'Dashboard',
        icon: 'Layers',
        accessKey: 'ACCESS_DASHBOARD',
        moduleLabel: 'Dashboard Overview',
        moduleDesc: 'Access to main statistics, compliance alerts, and checklist metrics',
        subPermissions: [
            { code: 'ACCESS_BULK_EXPORTS', label: 'Bulk Data Exports', desc: 'Allows viewing and downloading bulk compliance, client, and audit export packages' },
            { code: 'ACCESS_ACTIVE_CLIENT_SUMMARY', label: 'Active Client Summary', desc: 'Allows viewing the Active Client Summary table and metrics on the admin dashboard' },
        ],
    },
    {
        tab: 'staff',
        label: 'Staff Control',
        icon: 'Users',
        accessKey: 'ACCESS_STAFF',
        moduleLabel: 'Staff Control Desk',
        moduleDesc: 'Manage staff profiles, employee codes, and NISM validity checks',
        subPermissions: [
            { code: 'MANAGE_STAFF_DSC', label: 'Researcher Hardware DSC Permissions', desc: 'Allows viewing and managing physical USB DSC token permissions for Research Analysts' },
        ],
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
        tab: 'vaults',
        label: 'Client Vaults',
        icon: 'FolderArchive',
        accessKey: 'ACCESS_VAULTS',
        moduleLabel: 'Client Digital Vaults Desk',
        moduleDesc: 'Desktop-style hierarchical file explorer for client dossiers, trade performance, documents, and call recordings',
        subPermissions: [
            { code: 'ACCESS_VAULTS_VIEW', label: 'Only View (No Downloads)', desc: 'Allows viewing client vault records. All download buttons are hidden' },
            { code: 'ACCESS_VAULTS_FULL', label: 'Full Access (View & Download)', desc: 'Full access to view and download all client vault files, folders, and complete ZIP dossiers' },
            { code: 'MASK_VAULT_DATA', label: 'Mask Sensitive Data', desc: 'Masks client PAN, Mobile, and Email in vault views. Download buttons will also remain hidden' }
        ]
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
        tab: 'delivery-reports',
        label: 'Delivery Reports',
        icon: 'Send',
        accessKey: 'ACCESS_RESEARCH',
        moduleLabel: 'Delivery Reports Desk',
        moduleDesc: 'Audit multi-channel delivery logs across Telegram, SMS, and Client Panel alerts',
        subPermissions: [
            { code: 'VIEW_ALL_DELIVERIES', label: 'View Delivery Reports', desc: 'Allows viewing multi-channel dispatch delivery reports' }
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
        tab: 'l2-approvals',
        label: 'L2 Verification',
        icon: 'ShieldCheck',
        accessKey: 'ACCESS_L2_VERIFICATION',
        moduleLabel: 'L2 Verification Desk',
        moduleDesc: 'Multi-level review, modification, and final authorization for client plan payments before invoice dispatch',
        subPermissions: [
            { code: 'APPROVE_L2_PAYMENTS', label: 'Approve / Reject L2 Payments', desc: 'Allows modifying plan details, payment date, service start date and approving or rejecting payments' },
        ],
    },
    {
        tab: 'payments',
        label: 'Payment History',
        icon: 'FileText',
        accessKey: 'ACCESS_PAYMENTS',
        moduleLabel: 'Payment History Desk',
        moduleDesc: 'View all successful client payments and subscriptions',
        subPermissions: [
            { code: 'ACCESS_PAYMENT_QR_VERIFICATION', label: 'QR & Screenshot Verifications', desc: 'Allows viewing and verifying manual QR code payment screenshots' },
            { code: 'APPROVE_L2_PAYMENTS', label: 'L2 Payment Approval & Modification', desc: 'Allows reviewing, modifying, and giving final L2 approval for client payments' },
        ],
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
        tab: 'checklist',
        label: 'SEBI Checklist',
        icon: 'CheckSquare',
        accessKey: 'ACCESS_CHECKLIST',
        moduleLabel: 'SEBI Checklist',
        moduleDesc: 'View and manage SEBI compliance checklist',
    },
    {
        tab: 'penalty-matrix',
        label: 'Penalty Matrix',
        icon: 'ShieldAlert',
        accessKey: 'ACCESS_CHECKLIST',
        moduleLabel: 'SEBI Penalty Matrix',
        moduleDesc: 'Complete official reference schedule of all 78 SEBI penalties, triggers, and compliance frequencies',
    },
    {
        tab: 'tickets',
        label: 'Support / Ticket System',
        icon: 'LifeBuoy',
        accessKey: 'ACCESS_TICKETS',
        moduleLabel: 'Support & Helpdesk Desk',
        moduleDesc: 'Manage customer support tickets, chat with clients, and manage FAQs displayed in client portal',
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
        accessKey: 'ACCESS_PERSONAL_SETTINGS',
        moduleLabel: 'Personal Settings',
        moduleDesc: 'Configure your signature and UI preferences',
    },
    {
        tab: 'resources',
        label: 'Resources',
        icon: 'FileText',
        accessKey: 'ACCESS_RESOURCES',
        moduleLabel: 'Resources & Documents',
        moduleDesc: 'Download templates, formats, and other resources',
    },
    {
        tab: 'video_kyc',
        label: 'Video KYC & IPV',
        icon: 'Video',
        accessKey: 'ACCESS_COMPLIANCE',
        moduleLabel: 'Video KYC & IPV Desk',
        moduleDesc: 'Conduct and review live 2-way SEBI Video KYC sessions with recording compression and consent logging',
    },
];
// Map icon string -> Lucide component (keeps NAV_CONFIG serialisable)
const ICON_MAP = {
    Layers, Users, ClipboardList, TrendingUp, AlertTriangle, FileText, Settings, ShieldCheck, Activity, LifeBuoy, CheckSquare, FolderArchive, Folder, Video, Send, Smartphone, Monitor, ShieldAlert
};
// =============================================================================
// SEGMENT-WISE EXPIRY STACKING ALGORITHM
// For each segment (Cash, Commodity, Future, Option), sorts non-cancelled 
// subscriptions by startDate ascending and stacks durations sequentially.
// If a new plan's startDate is after the current segment's expiry, it starts fresh.
// Otherwise, it extends from the current expiry.
// =============================================================================
function getSegmentKey(segStr) {
    const s = segStr.trim().toUpperCase();
    if (s.includes('CASH') || s.includes('EQUITY'))
        return 'Cash';
    if (s.includes('COMMODITY') || s.includes('MCX'))
        return 'Commodity';
    if (s.includes('FUTURE') || s.includes('DERIVATIVE'))
        return 'Future';
    if (s.includes('OPTION'))
        return 'Option';
    return null;
}
function calculateSegmentExpiries(subscriptions) {
    const expiries = {
        'Cash': null,
        'Commodity': null,
        'Future': null,
        'Option': null,
    };
    // Only use non-cancelled subscriptions, sorted by startDate ascending
    const validSubs = (subscriptions || [])
        .filter((s) => s.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    validSubs.forEach((sub) => {
        const researchSegments = sub.plan?.researchSegments || sub.planSegments || '';
        if (!researchSegments)
            return;
        const segs = Array.isArray(researchSegments) ? researchSegments : researchSegments.split(',');
        const purchaseDate = new Date(sub.startDate);
        // Duration in ms: calculate from endDate if available, or durationMonths fallback
        let durationMs = 0;
        if (sub.endDate && sub.startDate) {
            durationMs = Math.max(0, new Date(sub.endDate).getTime() - purchaseDate.getTime());
        }
        if (durationMs <= 0 && sub.plan?.durationMonths) {
            durationMs = sub.plan.durationMonths * 30 * 24 * 60 * 60 * 1000;
        }
        if (durationMs <= 0) {
            durationMs = 30 * 24 * 60 * 60 * 1000; // default 1 month
        }
        segs.forEach((seg) => {
            const key = getSegmentKey(seg);
            if (!key)
                return;
            const currentExpiry = expiries[key];
            if (!currentExpiry || purchaseDate >= currentExpiry) {
                // No overlap — starts fresh from purchase date
                expiries[key] = new Date(purchaseDate.getTime() + durationMs);
            }
            else {
                // Overlap — stack on top of current expiry
                expiries[key] = new Date(currentExpiry.getTime() + durationMs);
            }
        });
    });
    return expiries;
}
// Computes overall plan status and active/expired segment chips for a client
function getClientPlanAndSegmentStatus(row) {
    const subs = row.subscriptions || [];
    if (!subs || subs.length === 0) {
        return {
            planStatus: 'NO_PLAN',
            segments: []
        };
    }
    const now = new Date();
    const segmentExpiries = calculateSegmentExpiries(subs);
    // Available segments in this client's history
    const allKnownKeys = ['Cash', 'Future', 'Option', 'Commodity'];
    const relevantSegments = [];
    allKnownKeys.forEach(key => {
        const exp = segmentExpiries[key];
        if (exp) {
            const isActive = exp >= now;
            relevantSegments.push({
                key,
                label: key.toUpperCase(),
                isActive,
                expiry: exp
            });
        }
    });
    // Check if any subscription or segment is active right now
    const hasActiveSegment = relevantSegments.some(s => s.isActive);
    const activeSub = subs.find((s) => s.status !== 'CANCELLED' && new Date(s.endDate) >= now);
    if (activeSub || hasActiveSegment) {
        return {
            planStatus: 'ACTIVE',
            activePlanName: activeSub?.plan?.name || subs[0]?.plan?.name || 'Active Plan',
            expiryDate: activeSub?.endDate ? new Date(activeSub.endDate) : null,
            segments: relevantSegments
        };
    }
    // If client had subscriptions but all are past expiry
    const latestSub = subs.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
    return {
        planStatus: 'EXPIRED',
        activePlanName: latestSub?.plan?.name || 'Expired Plan',
        expiryDate: latestSub?.endDate ? new Date(latestSub.endDate) : null,
        segments: relevantSegments
    };
}
// Dynamically compute display status: if DB says ACTIVE but endDate passed, show EXPIRED
function getDisplayStatus(sub) {
    if (sub.status === 'CANCELLED')
        return 'CANCELLED';
    if (new Date(sub.endDate) < new Date())
        return 'EXPIRED';
    return sub.status; // ACTIVE
}
const downloadCSV = (data, filename) => {
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
            if (val === null || val === undefined)
                return '""';
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
const tableCustomStyles = {
    table: {
        style: {
            backgroundColor: 'transparent',
        },
    },
    headRow: {
        style: {
            backgroundColor: 'rgba(241, 245, 249, 0.5)',
            borderBottomColor: 'rgba(203, 213, 225, 0.5)',
            minHeight: '44px',
        },
    },
    headCells: {
        style: {
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'rgb(71, 85, 105)',
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
    rows: {
        style: {
            fontSize: '13px',
            color: 'rgb(51, 65, 85)',
            backgroundColor: 'transparent',
            borderBottomColor: 'rgba(203, 213, 225, 0.3)',
            minHeight: '52px',
            '&:hover': {
                backgroundColor: 'rgba(241, 245, 249, 0.8)',
                transition: 'all 0.2s',
            },
        },
    },
    cells: {
        style: {
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
    pagination: {
        style: {
            backgroundColor: 'transparent',
            color: 'rgb(71, 85, 105)',
            borderTopColor: 'rgba(203, 213, 225, 0.5)',
            fontSize: '12px',
        },
    },
};
export function AdminProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { appName, logoUrl: appLogo, refreshBranding } = useBranding();
    const router = useRouter();
    // Dashboard & Auth states
    const [user, setUser] = useState({ firstName: '', email: '', role: '' });
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
    const [profileNewPassword, setProfileNewPassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
    const [isSecretVaultOpen, setIsSecretVaultOpen] = useState(false);
    const liveClickCountRef = useRef(0);
    const liveClickTimerRef = useRef(null);
    const handleLiveBadgeClick = () => {
        liveClickCountRef.current += 1;
        if (liveClickCountRef.current === 1) {
            liveClickTimerRef.current = setTimeout(() => {
                liveClickCountRef.current = 0;
            }, 10000); // 10-second window
        }
        if (liveClickCountRef.current >= 5) {
            if (liveClickTimerRef.current)
                clearTimeout(liveClickTimerRef.current);
            liveClickCountRef.current = 0;
            setIsSecretVaultOpen(true);
        }
    };
    const [goLivePassword, setGoLivePassword] = useState('');
    const [showGoLivePassword, setShowGoLivePassword] = useState(false);
    const [isSubmittingGoLive, setIsSubmittingGoLive] = useState(false);
    const [tenantIsLive, setTenantIsLive] = useState(false);
    const [tenantGoLiveAt, setTenantGoLiveAt] = useState(null);
    const [tenantCutoffDate, setTenantCutoffDate] = useState(null);
    const [completeness, setCompleteness] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('tenant_completeness');
            if (cached !== null)
                return Number(cached);
        }
        return 100;
    });

  const { states } = useStates();

  const [isCompletenessLoading, setIsCompletenessLoading] = useState(true);
const [wizardStep, setWizardStep] = useState(1);
const [wizardDetails, setWizardDetails] = useState({
    organization: false,
    principalOfficer: false,
    complianceOfficer: false,
    grievance: false,
    internalPolicy: false
});
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
const [activeTab, setActiveTab] = useState('dashboard');
const activeTabRef = useRef('dashboard');
useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
const [dashboardStats, setDashboardStats] = useState({ staffCount: 0, clientCount: 0, researchCount: 0, planCount: 0 });
const [settingsTab, setSettingsTab] = useState('general');
const [tenantDetails, setTenantDetails] = useState(null);
useEffect(() => {
    if (tenantDetails?.complianceFeaturesEnabled === false && ['compliance', 'checklist', 'penalty-matrix'].includes(activeTab)) {
        setActiveTab('dashboard');
    }
}, [tenantDetails?.complianceFeaturesEnabled, activeTab]);
const [telegramTradeEnabled, setTelegramTradeEnabled] = useState(false);
const [smsTradeEnabled, setSmsTradeEnabled] = useState(false);
const [telegramBotToken, setTelegramBotToken] = useState('');
const [telegramBotUsername, setTelegramBotUsername] = useState('');
const [telegramJoinRule, setTelegramJoinRule] = useState('ACTIVE_PLAN_ONLY');
const [testingBot, setTestingBot] = useState(false);
const [savingTradeDispatch, setSavingTradeDispatch] = useState(false);
const [botTestResult, setBotTestResult] = useState(null);
const [availableOccupations, setAvailableOccupations] = useState([]);
const [integrationTab, setIntegrationTab] = useState('payments');
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [activityLogs, setActivityLogs] = useState([]);
const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
const [auditSearchQuery, setAuditSearchQuery] = useState('');
const [auditCategoryFilter, setAuditCategoryFilter] = useState('ALL');
const [auditRoleFilter, setAuditRoleFilter] = useState('ALL');
const [selectedAuditLog, setSelectedAuditLog] = useState(null);
const [auditCurrentPage, setAuditCurrentPage] = useState(1);
const [adminPagesList, setAdminPagesList] = useState([]);
const [isPagesExpanded, setIsPagesExpanded] = useState(false);
const [isDeliveryReportsExpanded, setIsDeliveryReportsExpanded] = useState(false);
// Admin Live Notifications for Researcher Actions
const [adminNotifications, setAdminNotifications] = useState([]);
const [adminUnreadCount, setAdminUnreadCount] = useState(0);
const [isAdminNotifOpen, setIsAdminNotifOpen] = useState(false);
const [showAllNotifsModal, setShowAllNotifsModal] = useState(false);
const [notifModalFilter, setNotifModalFilter] = useState('ALL');
const [notifSearchQuery, setNotifSearchQuery] = useState('');
const [showRawAuditJson, setShowRawAuditJson] = useState(false);
const fetchAdminNotifications = async () => {
    try {
        const res = await api.getAdminNotifications();
        if (res.success && Array.isArray(res.data)) {
            setAdminNotifications(res.data);
            const unread = res.data.filter((n) => !n.isRead && !n.read && n.status !== 'READ');
            setAdminUnreadCount(unread.length);
        }
    }
    catch (e) {
        // background fetch
    }
};
useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 8000);
    return () => clearInterval(interval);
}, []);
const handleMarkAdminNotifsRead = async () => {
    try {
        await api.markAdminNotificationsAsRead();
        setAdminNotifications(prev => prev.map((n) => ({ ...n, isRead: true, read: true })));
        setAdminUnreadCount(0);
        toast.success('All admin notifications marked as read');
    }
    catch (e) {
        console.error(e);
    }
};
useEffect(() => {
    if (activeTab && activeTab.startsWith('customPages')) {
        setIsPagesExpanded(true);
    }
}, [activeTab]);
const [roles, setRoles] = useState([]);
const [selectedRole, setSelectedRole] = useState(null);
const rolesScrollRef = useRef(null);
const [savingPermissions, setSavingPermissions] = useState(false);
const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
const [newRoleName, setNewRoleName] = useState('');
const [newRoleDesc, setNewRoleDesc] = useState('');
const [newRoleRequiresNism, setNewRoleRequiresNism] = useState(false);
const [newRoleTwoFactorAuth, setNewRoleTwoFactorAuth] = useState('DISABLED');
const [roleModalLoading, setRoleModalLoading] = useState(false);
const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
const [editRoleName, setEditRoleName] = useState('');
const [editRoleDesc, setEditRoleDesc] = useState('');
const [editRoleId, setEditRoleId] = useState('');
const [editRoleRequiresNism, setEditRoleRequiresNism] = useState(false);
const [editRoleTwoFactorAuth, setEditRoleTwoFactorAuth] = useState('DISABLED');
const [editRoleModalLoading, setEditRoleModalLoading] = useState(false);
const [permissionSearchQuery, setPermissionSearchQuery] = useState('');
const [revealedStaffPassword, setRevealedStaffPassword] = useState(null);
const [isLoadingStaffPassword, setIsLoadingStaffPassword] = useState(false);
const [isResendingStaffPassword, setIsResendingStaffPassword] = useState(false);
const hasPermission = (permCode) => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN')
        return true;
    if (permCode === 'ACCESS_VAULTS') {
        return user?.permissions?.includes('ACCESS_VAULTS') ||
            user?.permissions?.includes('ACCESS_VAULTS_VIEW') ||
            user?.permissions?.includes('ACCESS_VAULTS_FULL') || false;
    }
    if (permCode === 'ACCESS_CHECKLIST') {
        return user?.permissions?.includes('ACCESS_CHECKLIST') || user?.permissions?.includes('ACCESS_COMPLIANCE') || false;
    }
    if (permCode === 'ACCESS_L2_VERIFICATION') {
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN')
            return true;
        return user?.permissions?.includes('ACCESS_L2_VERIFICATION') ||
            user?.permissions?.includes('APPROVE_L2_PAYMENTS') ||
            (tenantDetails?.l2ApprovalRoleId && (user?.roleId === tenantDetails.l2ApprovalRoleId || user?.role?._id === tenantDetails.l2ApprovalRoleId)) ||
            false;
    }
    return user?.permissions?.includes(permCode) || false;
};
const handleTogglePermission = (permCode) => {
    if (!selectedRole || ['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name))
        return;
    setSelectedRole((prev) => {
        const currentPerms = prev.permissions || [];
        let newPerms = currentPerms.includes(permCode)
            ? currentPerms.filter((p) => p !== permCode)
            : [...currentPerms, permCode];
        // Mutually exclusive handling for Vaults: Only View vs Full Access vs Masking
        if (permCode === 'ACCESS_VAULTS_VIEW' && !currentPerms.includes('ACCESS_VAULTS_VIEW')) {
            newPerms = newPerms.filter((p) => p !== 'ACCESS_VAULTS_FULL');
            if (!newPerms.includes('ACCESS_VAULTS'))
                newPerms.push('ACCESS_VAULTS');
        }
        if (permCode === 'ACCESS_VAULTS_FULL' && !currentPerms.includes('ACCESS_VAULTS_FULL')) {
            newPerms = newPerms.filter((p) => p !== 'ACCESS_VAULTS_VIEW' && p !== 'MASK_VAULT_DATA');
            if (!newPerms.includes('ACCESS_VAULTS'))
                newPerms.push('ACCESS_VAULTS');
        }
        if (permCode === 'MASK_VAULT_DATA' && !currentPerms.includes('MASK_VAULT_DATA')) {
            newPerms = newPerms.filter((p) => p !== 'ACCESS_VAULTS_FULL');
            if (!newPerms.includes('ACCESS_VAULTS_VIEW'))
                newPerms.push('ACCESS_VAULTS_VIEW');
            if (!newPerms.includes('ACCESS_VAULTS'))
                newPerms.push('ACCESS_VAULTS');
        }
        if (permCode === 'ACCESS_VAULTS' && currentPerms.includes('ACCESS_VAULTS')) {
            newPerms = newPerms.filter((p) => !['ACCESS_VAULTS', 'ACCESS_VAULTS_VIEW', 'ACCESS_VAULTS_FULL', 'MASK_VAULT_DATA'].includes(p));
        }
        return { ...prev, permissions: newPerms };
    });
};
const [filterActiveClientRange, setFilterActiveClientRange] = useState('daily');
const [activeClientDownloadStartDate, setActiveClientDownloadStartDate] = useState('');
const [activeClientDownloadEndDate, setActiveClientDownloadEndDate] = useState('');
// Bulk Export State
const [exportRange, setExportRange] = useState('all');
const [exportStartDate, setExportStartDate] = useState('');
const [exportEndDate, setExportEndDate] = useState('');
const [exportLoading, setExportLoading] = useState(null);
const handleSavePermissions = async () => {
    if (!selectedRole)
        return;
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to save permissions.');
            }
            finally {
                setSavingPermissions(false);
            }
        }
    });
};
const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName) {
        toast('Role name is required.');
        return;
    }
    setRoleModalLoading(true);
    try {
        const res = await api.createRole({
            name: newRoleName,
            description: newRoleDesc,
            requiresNism: newRoleRequiresNism,
            twoFactorAuth: newRoleTwoFactorAuth
        });
        if (res.success) {
            setIsRoleModalOpen(false);
            setNewRoleName('');
            setNewRoleDesc('');
            setNewRoleRequiresNism(false);
            setNewRoleTwoFactorAuth('DISABLED');
            toast.success('Role created successfully.');
            await loadData();
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to create role.');
    }
    finally {
        setRoleModalLoading(false);
    }
};
const handleEditRole = async (e) => {
    e.preventDefault();
    if (!editRoleName) {
        toast('Role name is required.');
        return;
    }
    setEditRoleModalLoading(true);
    try {
        const res = await api.updateRole(editRoleId, {
            name: editRoleName,
            description: editRoleDesc,
            requiresNism: editRoleRequiresNism,
            twoFactorAuth: editRoleTwoFactorAuth
        });
        if (res.success) {
            setIsEditRoleModalOpen(false);
            setEditRoleName('');
            setEditRoleDesc('');
            setEditRoleId('');
            setEditRoleRequiresNism(false);
            setEditRoleTwoFactorAuth('DISABLED');
            toast.success('Role updated successfully.');
            await loadData();
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to update role.');
    }
    finally {
        setEditRoleModalLoading(false);
    }
};
const handleDeleteRole = (roleId) => {
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
            }
            catch (err) {
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
const [reportYear, setReportYear] = useState(new Date().getFullYear());
const [reportStartYear, setReportStartYear] = useState(new Date().getFullYear());
const [reportHalf, setReportHalf] = useState('H1');
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
const [staff, setStaff] = useState([]);
const [researcherDscList, setResearcherDscList] = useState([]);
const [loadingResearcherDsc, setLoadingResearcherDsc] = useState(false);
const [updatingDscScopeId, setUpdatingDscScopeId] = useState(null);
const [staffDscScope, setStaffDscScope] = useState('DISABLED');
const [clients, setClients] = useState([]);
const [deletedClients, setDeletedClients] = useState([]);
const [clientSubTab, setClientSubTab] = useState('active');
const [clientSearch, setClientSearch] = useState('');
const [kraFilter, setKraFilter] = useState('ALL'); // ALL, VERIFIED, FAILED, PENDING
const [esignFilter, setEsignFilter] = useState('ALL');
const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL, SIGNED, PENDING
const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE, PENDING_APPROVAL
const [clientStartDate, setClientStartDate] = useState('');
const [clientEndDate, setClientEndDate] = useState('');
const [adminPlans, setAdminPlans] = useState([]);
const [categories, setCategories] = useState([]);
const [planManagementTab, setPlanManagementTab] = useState('categories');
const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
const [showDeletedPlans, setShowDeletedPlans] = useState(false);
const [research, setResearch] = useState([]);
const [alerts, setAlerts] = useState([]);
const [pendingPayments, setPendingPayments] = useState([]);
const [plans, setPlans] = useState([]);
const [checklist, setChecklist] = useState([]);
const [checklistHistory, setChecklistHistory] = useState([]);
const [checklistSubTab, setChecklistSubTab] = useState('active');
const [checklistStatusFilter, setChecklistStatusFilter] = useState('ALL');
const [showCalendarModal, setShowCalendarModal] = useState(false);
const [alertsSubTab, setAlertsSubTab] = useState('active');
const [historyFilterText, setHistoryFilterText] = useState('');
const [selectedFinancialYear, setSelectedFinancialYear] = useState('All');
const [penalties, setPenalties] = useState([]);
const [complianceTab, setComplianceTab] = useState('overview');
const [alertViewMode, setAlertViewMode] = useState('card');
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
const [complaints, setComplaints] = useState([]);
const [auditModalReq, setAuditModalReq] = useState(null);
const [auditStatus, setAuditStatus] = useState('');
const [auditRemarks, setAuditRemarks] = useState('');
const [auditPenaltyAmt, setAuditPenaltyAmt] = useState('');
const [auditProof, setAuditProof] = useState(null);
const [penaltyResolveId, setPenaltyResolveId] = useState(null);
const [penaltyResolutionType, setPenaltyResolutionType] = useState('');
const [penaltyPayRef, setPenaltyPayRef] = useState('');
const [penaltyProof, setPenaltyProof] = useState(null);
const [penaltyRemarks, setPenaltyRemarks] = useState('');
const [resolveLoading, setResolveLoading] = useState(false);
// Complaint resolve state
const [complaintResolveId, setComplaintResolveId] = useState(null);
const [complaintAtrProof, setComplaintAtrProof] = useState(null);
const [complaintAtrRemarks, setComplaintAtrRemarks] = useState('');
const [complaintResolveLoading, setComplaintResolveLoading] = useState(false);
const [viewingComplaint, setViewingComplaint] = useState(null);
const [viewingAuditDetail, setViewingAuditDetail] = useState(null);
const [allPayments, setAllPayments] = useState([]);
const pendingQrCount = useMemo(() => {
    return allPayments.filter((p) => (p.paymentMode === 'UPI_QR' || p.screenshotUrl || p.paymentMode === 'MANUAL_UPI' || p.receiptUrl) &&
        (p.status || 'PENDING').toUpperCase() === 'PENDING' &&
        p.approvalStatus !== 'L2_PENDING').length;
}, [allPayments]);
const complianceAlertCount = useMemo(() => {
    return alerts.filter((a) => (a.status || 'OPEN').toUpperCase() === 'OPEN').length;
}, [alerts]);
const checklistPendingCount = useMemo(() => {
    if (tenantCutoffDate && new Date() < new Date(tenantCutoffDate)) {
        return 0;
    }
    const AUTO_MONITORED_SERIALS = [4, 5, 6, 12, 17, 48];
    return checklist.filter((item) => !item.isUpcoming &&
        !AUTO_MONITORED_SERIALS.includes(item.serialNo) &&
        (!item.audit || item.audit.status === 'PENDING' || item.audit.status === 'OVERDUE' || item.audit.status === 'NON_COMPLIANT')).length;
}, [checklist, tenantCutoffDate]);
const [paymentSearch, setPaymentSearch] = useState('');
const [dashboardMetric, setDashboardMetric] = useState('sales');
const [dashboardTimeframe, setDashboardTimeframe] = useState('monthly');
// Support Tickets & FAQ Admin State
const [adminTickets, setAdminTickets] = useState([]);
const [selectedAdminTicket, setSelectedAdminTicket] = useState(null);
const [adminReplyText, setAdminReplyText] = useState('');
const [adminReplyAttachment, setAdminReplyAttachment] = useState(null);
const [adminTicketStatusFilter, setAdminTicketStatusFilter] = useState('ALL');
const [supportSubTab, setSupportSubTab] = useState('tickets');
// Plan modal state
const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
const [catName, setCatName] = useState('');
const [catSegments, setCatSegments] = useState([]);
const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
const [planCategoryId, setPlanCategoryId] = useState('');
const [editingPlan, setEditingPlan] = useState(null);
const [planName, setPlanName] = useState('');
const [planDesc, setPlanDesc] = useState('');
const [planPrice, setPlanPrice] = useState('');
const [planDuration, setPlanDuration] = useState('1');
const [planSegments, setPlanSegments] = useState(['EQUITY']);
const [planNotifs, setPlanNotifs] = useState(['EMAIL', 'INAPP']);
const [planClientLimit, setPlanClientLimit] = useState('100');
// Add Client modal state
const [isClientModalOpen, setIsClientModalOpen] = useState(false);
const [clientDuplicateField, setClientDuplicateField] = useState(null);
const [clientDuplicateError, setClientDuplicateError] = useState(null);
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
const [selectedClient, setSelectedClient] = useState(null);
const [isViewClientModalOpen, setIsViewClientModalOpen] = useState(false);
const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
const [editingClient, setEditingClient] = useState(null);
useEffect(() => {
    if (isClientModalOpen || isEditClientModalOpen || activeTab === 'clients') {
        api.getOccupations().then(res => {
            if (res && res.success && Array.isArray(res.data)) {
                setAvailableOccupations(res.data);
            }
        }).catch(() => { });
    }
}, [isClientModalOpen, isEditClientModalOpen, activeTab]);
// Assign Plan by Admin modal state
const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
const [assignPlanClient, setAssignPlanClient] = useState(null);
const [assignPlanCategoryId, setAssignPlanCategoryId] = useState('');
const [assignPlanId, setAssignPlanId] = useState('');
const [assignPlanRemarks, setAssignPlanRemarks] = useState('');
const [assignPaymentRefId, setAssignPaymentRefId] = useState('');
const [assignPaymentDate, setAssignPaymentDate] = useState('');
const [assignServiceStartDate, setAssignServiceStartDate] = useState('');
const [selectedL2Payment, setSelectedL2Payment] = useState(null);
const [l2FilterTab, setL2FilterTab] = useState('PENDING');
const [selectedL1L2Diff, setSelectedL1L2Diff] = useState(null);
const [l2ApprovalEnabled, setL2ApprovalEnabled] = useState(false);
const [fileDownloadPolicy, setFileDownloadPolicy] = useState('BOTH');
const [fileDownloadNotificationEmail, setFileDownloadNotificationEmail] = useState('');
const [maxEmailFileSizeMb, setMaxEmailFileSizeMb] = useState(10);
const [assignPlanLoading, setAssignPlanLoading] = useState(false);
const [assignPlanFeeSummary, setAssignPlanFeeSummary] = useState(null);
const [isLoadingFeeSummary, setIsLoadingFeeSummary] = useState(false);
useEffect(() => {
    if (isAssignPlanModalOpen && assignPlanClient) {
        const cId = assignPlanClient.id || assignPlanClient._id;
        setIsLoadingFeeSummary(true);
        api.get(`/admin/clients/${cId}/fee-summary`)
            .then((res) => {
            if (res.data?.success)
                setAssignPlanFeeSummary(res.data.data);
        })
            .catch(() => setAssignPlanFeeSummary(null))
            .finally(() => setIsLoadingFeeSummary(false));
    }
    else {
        setAssignPlanFeeSummary(null);
    }
}, [isAssignPlanModalOpen, assignPlanClient]);
const [assignCustomAmount, setAssignCustomAmount] = useState('');
const [assignCustomDays, setAssignCustomDays] = useState('');
const [assignCouponCode, setAssignCouponCode] = useState('');
const [coupons, setCoupons] = useState([]);
const getPlanAmountWithCoupon = (basePrice, durationMonths, couponCode) => {
    let finalBase = basePrice;
    if (couponCode) {
        const coupon = coupons.find((c) => c.code === couponCode && c.status === 'ACTIVE');
        if (coupon) {
            let disc = 0;
            if (coupon.discountType === 'FLAT') {
                disc = coupon.discountValue;
            }
            else if (coupon.discountType === 'PERCENTAGE') {
                disc = (basePrice * coupon.discountValue) / 100;
                if (coupon.percentageType === 'CAPPED' && coupon.maxDiscountValue && disc > coupon.maxDiscountValue) {
                    disc = coupon.maxDiscountValue;
                }
            }
            if (disc > basePrice)
                disc = basePrice;
            finalBase = basePrice - disc;
        }
    }
    return gstCalculationType === 'EXCLUSIVE' ? Math.round(finalBase * 1.18) : finalBase;
};
// Reusable confirmation state
const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'warning',
    onConfirm: () => { },
});
const triggerConfirm = (options) => {
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
const handleAssignPlan = async (e) => {
    e.preventDefault();
    if (!assignPlanId) {
        toast('Please select a plan.');
        return;
    }
    if (!assignPaymentRefId.trim()) {
        toast('Please enter Payment Ref ID.');
        return;
    }
    if (!assignPaymentDate) {
        toast('Please select Payment Date.');
        return;
    }
    const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
    if (!selectedPlan)
        return;
    let basePrice = selectedPlan.price;
    let finalPrice = (!gstEnabled || gstCalculationType !== 'EXCLUSIVE') ? basePrice : Math.round(basePrice * 1.18);
    if (assignCustomAmount.trim()) {
        finalPrice = Number(assignCustomAmount);
        if (gstEnabled && gstCalculationType === 'EXCLUSIVE') {
            basePrice = Math.round(finalPrice / 1.18);
        }
        else {
            basePrice = finalPrice;
        }
    }
    const gstAmount = gstEnabled ? (finalPrice - basePrice) : 0;
    const messageNode = (<div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <p>
          Are you sure you want to assign the plan <strong>"{selectedPlan.name}"</strong> to client <strong>"{assignPlanClient?.name || ''}"</strong>?
        </p>
        <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between"><span>Base Amount:</span> <span className="text-slate-800 dark:text-slate-200">₹{basePrice.toLocaleString()}</span></div>
          {gstEnabled && gstCalculationType === 'EXCLUSIVE' ? (<>
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>GST (18%):</span> <span className="text-slate-700 dark:text-slate-300">₹{gstAmount.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-slate-400 dark:border-white/10 pt-1.5 font-extrabold text-violet-400"><span>Total Amount:</span> <span>₹{finalPrice.toLocaleString()}</span></div>
            </>) : gstEnabled ? (<div className="flex justify-between border-t border-slate-400 dark:border-white/10 pt-1.5 font-extrabold text-violet-400"><span>Total (GST Incl.):</span> <span>₹{finalPrice.toLocaleString()}</span></div>) : (<div className="flex justify-between border-t border-slate-400 dark:border-white/10 pt-1.5 font-extrabold text-violet-400"><span>Total Amount:</span> <span>₹{finalPrice.toLocaleString()}</span></div>)}
          <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-400 dark:border-white/10 pt-1.5"><span>Payment Ref:</span> <span className="text-slate-700 dark:text-slate-300">{assignPaymentRefId}</span></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Payment Date:</span> <span className="text-slate-700 dark:text-slate-300">{assignPaymentDate}</span></div>
          {assignCustomDays.trim() && (<div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-400 dark:border-white/10 pt-1.5"><span>Service Validity:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{assignCustomDays} Days</span></div>)}
        </div>
        <p className="text-slate-500 dark:text-slate-500 text-[10px]">This will immediately activate the plan. Any existing active subscription will be cancelled.</p>
      </div>);
    triggerConfirm({
        title: 'Confirm Plan Assignment',
        message: messageNode,
        confirmLabel: 'Yes, Assign Plan',
        onConfirm: async () => {
            setAssignPlanLoading(true);
            try {
                const payload = {
                    planId: assignPlanId,
                    remarks: assignPlanRemarks,
                    paymentRefId: assignPaymentRefId,
                    paymentDate: assignPaymentDate,
                    serviceStartDate: assignServiceStartDate || assignPaymentDate
                };
                if (assignCustomAmount.trim())
                    payload.customAmount = Number(assignCustomAmount);
                if (assignCustomDays.trim())
                    payload.customDays = Number(assignCustomDays);
                if (assignCouponCode.trim())
                    payload.couponCode = assignCouponCode;
                const res = await api.assignPlanByAdmin(assignPlanClient.id, payload);
                if (res.success) {
                    setIsAssignPlanModalOpen(false);
                    setAssignPlanClient(null);
                    setAssignPlanCategoryId('');
                    setAssignPlanId('');
                    setAssignPlanRemarks('');
                    setAssignPaymentRefId('');
                    setAssignPaymentDate('');
                    setAssignServiceStartDate('');
                    setAssignCustomAmount('');
                    setAssignCustomDays('');
                    setAssignCouponCode('');
                    await loadData();
                    toast('✅ ' + res.message);
                }
            }
            catch (err) {
                toast.error(err.message || 'Failed to assign plan.');
            }
            finally {
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
const [editClientIsTelegramTradeEnabled, setEditClientIsTelegramTradeEnabled] = useState(true);
const [editClientIsSmsTradeEnabled, setEditClientIsSmsTradeEnabled] = useState(true);
const [editClientTelegramChatId, setEditClientTelegramChatId] = useState('');
const [editClientTelegramUsername, setEditClientTelegramUsername] = useState('');
const [editClientModalLoading, setEditClientModalLoading] = useState(false);
const [clientDetailsTab, setClientDetailsTab] = useState('profile');
const [viewClientIsTelegramTradeEnabled, setViewClientIsTelegramTradeEnabled] = useState(true);
const [viewClientIsSmsTradeEnabled, setViewClientIsSmsTradeEnabled] = useState(true);
const [viewClientTelegramChatId, setViewClientTelegramChatId] = useState('');
const [viewClientTelegramUsername, setViewClientTelegramUsername] = useState('');
const [savingClientChannels, setSavingClientChannels] = useState(false);
const [showManualDigioFetch, setShowManualDigioFetch] = useState(false);
const [selectedTimelineClient, setSelectedTimelineClient] = useState(null);
const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
const [clientCommunications, setClientCommunications] = useState([]);
// states is already declared above from useStates()
const { cities: clientCities } = useCities(clientState);
const { cities: editClientCities } = useCities(editClientState);
// Wizard input state
const [wizardErrors, setWizardErrors] = useState({});
const [formErrors, setFormErrors] = useState({});
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
const [gstEnabled, setGstEnabled] = useState(true);
const [gstCalculationType, setGstCalculationType] = useState('EXCLUSIVE');
const [invoiceDispatchPolicy, setInvoiceDispatchPolicy] = useState('AFTER_KYC_AGREEMENT');
const [sendingInvoiceId, setSendingInvoiceId] = useState(null);
const [tenantState, setTenantState] = useState('');
const [kycFirst, setKycFirst] = useState(true);
const [welcomeEmailText, setWelcomeEmailText] = useState('');
const [reportDisclaimer, setReportDisclaimer] = useState('');
const [termsPdf, setTermsPdf] = useState(null);
const [internalPolicyPdf, setInternalPolicyPdf] = useState(null);
const [logoFile, setLogoFile] = useState(null);
const [tenantLogoUrl, setTenantLogoUrl] = useState('');
const [privacyPdf, setPrivacyPdf] = useState(null);
const [termsPdfUrl, setTermsPdfUrl] = useState('');
const [privacyPdfUrl, setPrivacyPdfUrl] = useState('');
const [pdfPreviewModal, setPdfPreviewModal] = useState(null);
const [copiedVariable, setCopiedVariable] = useState(null);
// Confirmation Modals for Settings Toggles (GST & KYC Flow)
const [isGstConfirmModalOpen, setIsGstConfirmModalOpen] = useState(false);
const [pendingGstTargetState, setPendingGstTargetState] = useState(null);
const [isSavingGstToggle, setIsSavingGstToggle] = useState(false);
const [isKycFlowConfirmModalOpen, setIsKycFlowConfirmModalOpen] = useState(false);
const [pendingKycFirstState, setPendingKycFirstState] = useState(null);
const [isSavingKycFlowToggle, setIsSavingKycFlowToggle] = useState(false);
// SMTP Settings
const [smtpHost, setSmtpHost] = useState('');
const [smtpPort, setSmtpPort] = useState('');
const [smtpUser, setSmtpUser] = useState('');
const [smtpPassword, setSmtpPassword] = useState('');
const [smtpFrom, setSmtpFrom] = useState('');
const [testSmtpEmail, setTestSmtpEmail] = useState('');
const [isTestingSmtp, setIsTestingSmtp] = useState(false);
const [ccInvoiceEnabled, setCcInvoiceEnabled] = useState(false);
const [ccInvoiceEmail, setCcInvoiceEmail] = useState('');
const [ccAgreementEnabled, setCcAgreementEnabled] = useState(false);
const [ccAgreementEmail, setCcAgreementEmail] = useState('');
// Periodic Report Settings
const [bankAccountName, setBankAccountName] = useState('');
const [bankAccountNo, setBankAccountNo] = useState('');
const [bankAccountType, setBankAccountType] = useState('');
const [bankIfsc, setBankIfsc] = useState('');
const [bankName, setBankName] = useState('');
const [bankBranch, setBankBranch] = useState('');
const [socialMediaLinks, setSocialMediaLinks] = useState([{ platform: '', link: '' }]);
// Digio Settings & Agreement
const [digioClientId, setDigioClientId] = useState('');
const [digioClientSecret, setDigioClientSecret] = useState('');
const [digioKycTemplateName, setDigioKycTemplateName] = useState('');
const [digioEnvironment, setDigioEnvironment] = useState('SANDBOX');
const [testingDigio, setTestingDigio] = useState(false);
const [digioTestResult, setDigioTestResult] = useState(null);
// Fetch by Digio ID states (admin client KYC panel)
const [fetchDigioIdInput, setFetchDigioIdInput] = useState(''); // kept for backward compat (stores JSON)
const [fetchDigioKycId, setFetchDigioKycId] = useState('');
const [fetchDigioEsignId, setFetchDigioEsignId] = useState('');
const [fetchDigioLoading, setFetchDigioLoading] = useState(false);
const [fetchDigioResult, setFetchDigioResult] = useState(null);
const [fetchDigioError, setFetchDigioError] = useState('');
const [fetchDigioSaveMode, setFetchDigioSaveMode] = useState(false);
const [showDigioConfirmPopup, setShowDigioConfirmPopup] = useState(false);
// CAMS KRA Settings & Test
const [camsClientCode, setCamsClientCode] = useState('');
const [camsClientId, setCamsClientId] = useState('');
const [camsClientSecret, setCamsClientSecret] = useState('');
const [camsPoscode, setCamsPoscode] = useState('');
const [testingCams, setTestingCams] = useState(false);
const [camsTestResult, setCamsTestResult] = useState(null);
// CAMS KRA Fetch states (admin client KYC panel)
const [camsPanInput, setCamsPanInput] = useState('');
const [camsDobInput, setCamsDobInput] = useState('');
const [fetchCamsLoading, setFetchCamsLoading] = useState(false);
const [fetchCamsResult, setFetchCamsResult] = useState(null);
const [fetchCamsError, setFetchCamsError] = useState('');
const [fetchCamsSaveMode, setFetchCamsSaveMode] = useState(false);
const [showRawCamsJson, setShowRawCamsJson] = useState(false);
const [camsEditMode, setCamsEditMode] = useState(false);
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
const [verifyingGateway, setVerifyingGateway] = useState(false);
const [gatewayVerifyResult, setGatewayVerifyResult] = useState(null);
// Payment Gateway & QR/UPI Configuration States
const [paymentGatewayEnabled, setPaymentGatewayEnabled] = useState(true);
const [upiQrEnabled, setUpiQrEnabled] = useState(false);
const [upiId, setUpiId] = useState('');
const [upiPayeeName, setUpiPayeeName] = useState('');
const [upiQrImageUrl, setUpiQrImageUrl] = useState('');
const [upiQrImageFile, setUpiQrImageFile] = useState(null);
const [upiQrImagePreview, setUpiQrImagePreview] = useState('');
const [upiInstructions, setUpiInstructions] = useState('');
const [paymentSubTab, setPaymentSubTab] = useState('all');
const [selectedScreenshotModal, setSelectedScreenshotModal] = useState(null);
// Smart Verification Modal for QR / Manual Payments
const [selectedVerifyPayment, setSelectedVerifyPayment] = useState(null);
const [verifyReceivedAmount, setVerifyReceivedAmount] = useState(0);
const [verifyApprovalMode, setVerifyApprovalMode] = useState('FULL');
const [verifyCustomDays, setVerifyCustomDays] = useState(30);
const [verifyCustomDiscount, setVerifyCustomDiscount] = useState(0);
const [verifyUtr, setVerifyUtr] = useState('');
const [verifyRemarks, setVerifyRemarks] = useState('');
const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
const [agreementContent, setAgreementContent] = useState('');
// ── Mandatory Firm Setup Prerequisites State & Validation ──
const [isSetupPrereqModalOpen, setIsSetupPrereqModalOpen] = useState(false);
const [prereqActionTarget, setPrereqActionTarget] = useState('');
const getPrerequisitesStatus = () => {
    const hasLogo = Boolean(tenantLogoUrl || tenantDetails?.logoUrl || logoFile);
    const hasPrivacyPdf = Boolean(privacyPdf || privacyPdfUrl || tenantDetails?.privacyPdfUrl);
    const hasTermsPdf = Boolean(termsPdf || termsPdfUrl || tenantDetails?.termsPdfUrl);
    const hasAgreement = Boolean((agreementContent && agreementContent.trim().length > 20) || (tenantDetails?.agreementContent && tenantDetails.agreementContent.trim().length > 20));
    const hasWelcomeEmail = Boolean((welcomeEmailText && welcomeEmailText.trim().length > 10) || (tenantDetails?.welcomeEmailText && tenantDetails.welcomeEmailText.trim().length > 10));
    const hasDisclaimer = Boolean((reportDisclaimer && reportDisclaimer.trim().length > 10) || (tenantDetails?.reportDisclaimer && tenantDetails.reportDisclaimer.trim().length > 10));
    const hasSmtp = Boolean((smtpHost?.trim() && smtpUser?.trim()) || (tenantDetails?.smtpHost && tenantDetails?.smtpUser));
    const hasDigio = Boolean((digioClientId?.trim() && digioClientSecret?.trim()) || (tenantDetails?.digioClientId && tenantDetails?.digioClientSecret));
    const items = [
        {
            id: 'logo',
            name: 'Company Logo',
            description: 'Firm logo displayed on client invoices, portal header, research PDFs, and agreements.',
            completed: hasLogo,
            tab: 'general',
            subTab: null,
            badgeText: hasLogo ? 'Logo Configured' : 'Missing Logo'
        },
        {
            id: 'privacy',
            name: 'Privacy Policy PDF',
            description: 'Official investor privacy policy document complying with SEBI data protection standards.',
            completed: hasPrivacyPdf,
            tab: 'policies',
            subTab: null,
            badgeText: hasPrivacyPdf ? 'PDF Uploaded' : 'Missing PDF'
        },
        {
            id: 'terms',
            name: 'Terms & Conditions PDF',
            description: 'Mandatory Research Analyst terms of service, fee schedule, and client operating conditions.',
            completed: hasTermsPdf,
            tab: 'policies',
            subTab: null,
            badgeText: hasTermsPdf ? 'PDF Uploaded' : 'Missing PDF'
        },
        {
            id: 'agreement',
            name: 'Service Agreement Content',
            description: 'Legal clauses and SEBI RA agreement template text used for client Aadhaar eSigning.',
            completed: hasAgreement,
            tab: 'policies',
            subTab: null,
            badgeText: hasAgreement ? 'Template Ready' : 'Content Missing'
        },
        {
            id: 'welcome_email',
            name: 'Client Welcome Email Template',
            description: 'Automated welcome onboarding email sent to newly registered clients with portal credentials and dynamic variables.',
            completed: true,
            tab: 'email-templates',
            subTab: null,
            badgeText: 'Email Template Ready'
        },
        {
            id: 'disclaimer',
            name: 'Research Report Disclaimer',
            description: 'Statutory SEBI regulatory risk statement automatically appended to all recommendations.',
            completed: hasDisclaimer,
            tab: 'policies',
            subTab: null,
            badgeText: hasDisclaimer ? 'Disclaimer Configured' : 'Disclaimer Missing'
        },
        {
            id: 'smtp',
            name: 'Email & SMTP Configuration',
            description: 'SMTP host, port, credentials, and sender address for delivering KYC emails, OTPs, and invoices.',
            completed: hasSmtp,
            tab: 'integrations',
            subTab: 'email',
            badgeText: hasSmtp ? 'SMTP Connected' : 'Credentials Missing'
        },
        {
            id: 'digio',
            name: 'Digio KYC & eSign Configuration',
            description: 'Digio API credentials for DigiLocker Aadhaar KYC and legal eSign agreement stamping.',
            completed: hasDigio,
            tab: 'integrations',
            subTab: 'kyc',
            badgeText: hasDigio ? 'Digio Configured' : 'Keys Missing'
        }
    ];
    const completedCount = items.filter(i => i.completed).length;
    const isAllComplete = completedCount === items.length;
    return { items, completedCount, totalCount: items.length, isAllComplete };
};
const requireSetupPrerequisites = (actionName) => {
    const status = getPrerequisitesStatus();
    if (!status.isAllComplete) {
        setPrereqActionTarget(actionName);
        setIsSetupPrereqModalOpen(true);
        return false;
    }
    return true;
};
const handleNavigateToPrerequisite = (item) => {
    setIsSetupPrereqModalOpen(false);
    setActiveTab('settings');
    if (item.tab) {
        setSettingsTab(item.tab);
    }
    if (item.subTab) {
        setIntegrationTab(item.subTab);
    }
};
// Staff creation form state
const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
const [staffName, setStaffName] = useState('');
const [staffUsername, setStaffUsername] = useState('');
const [staffEmail, setStaffEmail] = useState('');
const [staffMobile, setStaffMobile] = useState('');
const [staffRole, setStaffRole] = useState('RESEARCHER');
const [associatedType, setAssociatedType] = useState('SALES');
const [customAssociatedRole, setCustomAssociatedRole] = useState('');
const [staffNism, setStaffNism] = useState('');
const [staffNismValidity, setStaffNismValidity] = useState('');
const [createdStaffCreds, setCreatedStaffCreds] = useState(null);
const [showStaffCredsPopup, setShowStaffCredsPopup] = useState(false);
// Staff popup and editing states
const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
const [editingStaff, setEditingStaff] = useState(null);
const [selectedStaff, setSelectedStaff] = useState(null);
const [staffNismFile, setStaffNismFile] = useState(null);
const [isParsingStaffNism, setIsParsingStaffNism] = useState(false);
const [staffNismParsed, setStaffNismParsed] = useState(null);
const [nismParseMsg, setNismParseMsg] = useState('');
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
const [complaintFoundClient, setComplaintFoundClient] = useState(null);
const [showClientNotFoundAlert, setShowClientNotFoundAlert] = useState(false);
const [isManualFillAllowed, setIsManualFillAllowed] = useState(false);
const handleSearchClientForComplaint = (queryStr) => {
    const q = (queryStr !== undefined ? queryStr : complaintSearchQuery).trim().toLowerCase();
    if (!q)
        return;
    const cleanQ = q.replace(/\s+/g, '');
    const matched = clients.find((cl) => {
        const nameStr = `${cl.name || ''} ${cl.user?.firstName || ''} ${cl.user?.lastName || ''}`.toLowerCase();
        const emailStr = (cl.email || cl.user?.email || '').toLowerCase();
        const mobileStr = (cl.mobile || '').replace(/\D/g, '');
        const panStr = (cl.pan || '').toLowerCase();
        const aadhaarStr = (cl.aadhaar || cl.profile?.aadhaar || '').replace(/\D/g, '');
        return (nameStr.includes(q) ||
            (emailStr && emailStr === q) ||
            (mobileStr && mobileStr === cleanQ) ||
            (panStr && panStr === cleanQ) ||
            (aadhaarStr && cleanQ.length >= 4 && aadhaarStr.includes(cleanQ)));
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
    }
    else {
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
const [checklistReportId, setChecklistReportId] = useState(null);
const [chkTnc, setChkTnc] = useState(false);
const [chkPolicy, setChkPolicy] = useState(false);
const [chkConsent, setChkConsent] = useState(false);
const [publishError, setPublishError] = useState(null);
// Close compliance alert state
const [closingAlertId, setClosingAlertId] = useState(null);
const [alertProof, setAlertProof] = useState(null);
const [depositTopup, setDepositTopup] = useState('50000');
const [closeRemarks, setCloseRemarks] = useState('');
const isNismDuplicate = staffNism.trim() !== '' && staff.some(st => st.nismNumber &&
    st.nismNumber.trim().toLowerCase() === staffNism.trim().toLowerCase() &&
    (!editingStaff || st.id !== editingStaff.id));
const isStaff = user && user.role && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN';
const getFullUrl = (url) => {
    if (!url)
        return 'N/A';
    if (url.startsWith('http'))
        return url;
    return `${api.getBaseUrl()}${url}`;
};
const AGREEMENT_VARIABLES = [
    { key: '{{CLIENT_NAME}}', label: 'Client Full Name' },
    { key: '{{CLIENT_EMAIL}}', label: 'Client Email' },
    { key: '{{CLIENT_MOBILE}}', label: 'Mobile Number' },
    { key: '{{PAN_NUMBER}}', label: 'PAN Number' },
    { key: '{{AADHAAR_NUMBER}}', label: 'Aadhaar Number' },
    { key: '{{CLIENT_ADDRESS}}', label: 'Client Address' },
    { key: '{{COMPANY_NAME}}', label: 'Company Name' },
    { key: '{{COMPANY_ADDRESS}}', label: 'Company Address' },
    { key: '{{SEBI_REGISTRATION}}', label: 'SEBI Reg. No.' },
    { key: '{{DATE}}', label: 'Agreement Date' },
];
const handleCopyVariable = (variableKey, variableLabel) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(variableKey);
        setCopiedVariable(variableKey);
        toast.success(`Copied ${variableKey} (${variableLabel || 'variable'}) to clipboard!`);
        setTimeout(() => setCopiedVariable(null), 2000);
    }
};
const openPdfPreview = (docType, title, fileObj, savedUrl) => {
    let previewUrl = '';
    let badge = 'Default SEBI Template';
    let defaultFilename = `${docType}_document.pdf`;
    if (fileObj) {
        previewUrl = URL.createObjectURL(fileObj);
        badge = 'New File (Ready to save)';
        defaultFilename = fileObj.name || `${docType}.pdf`;
    }
    else if (savedUrl) {
        previewUrl = getFullUrl(savedUrl);
        badge = 'Custom Uploaded Document';
        defaultFilename = savedUrl.split('/').pop() || `${docType}.pdf`;
    }
    else {
        const typeParam = docType === 'terms' ? 'terms' : docType === 'privacy' ? 'privacy' : 'internal-policy';
        previewUrl = `${api.getBaseUrl()}/api/v1/system-settings/preview-pdf/${typeParam}`;
        badge = 'Default SEBI Template';
        defaultFilename = `SEBI_${docType}_Policy.pdf`;
    }
    setPdfPreviewModal({
        isOpen: true,
        title,
        url: previewUrl,
        badgeText: badge,
        downloadFilename: defaultFilename
    });
};
const getPdfDirectUrl = (docType, fileObj, savedUrl) => {
    if (fileObj) {
        return URL.createObjectURL(fileObj);
    }
    if (savedUrl) {
        return getFullUrl(savedUrl);
    }
    const typeParam = docType === 'terms' ? 'terms' : docType === 'privacy' ? 'privacy' : 'internal-policy';
    return `${api.getBaseUrl()}/api/v1/system-settings/preview-pdf/${typeParam}`;
};
const handleDownloadCSV = (type) => {
    let dataToExport = [];
    let filename = `${type}.csv`;
    if (type === 'checklist' || type === 'audit_history') {
        let srcList = checklistSubTab === 'active' ? checklist : checklistHistory;
        filename = checklistSubTab === 'active' ? 'Active_Checklist.csv' : 'Checklist_History.csv';
        dataToExport = srcList.map((item) => ({
            'Requirement': item.requirement?.description || 'N/A',
            'Frequency': item.requirement?.frequencyType || 'N/A',
            'Status': item.audit?.status || 'PENDING',
            'Due/Updated Date': item.audit?.updatedAt ? new Date(item.audit.updatedAt).toLocaleDateString() : 'N/A',
            'Remarks': item.audit?.officerRemarks || 'N/A',
            'Proof URL': getFullUrl(item.audit?.proofDocumentUrl)
        }));
    }
    else if (type === 'alerts') {
        let srcList = alertsSubTab === 'active' ? alerts.filter((a) => a.status === 'OPEN') : alerts.filter((a) => a.status === 'CLOSED');
        filename = alertsSubTab === 'active' ? 'Active_Alerts.csv' : 'Resolved_Alerts_History.csv';
        dataToExport = srcList.map((a) => {
            let cleanRemarks = (a.remarks || '').replace(/Associated with Audit ID:\s*[a-f0-9\-]+/i, '').trim();
            return {
                'Alert Type': a.alertType || 'N/A',
                'Status': a.status || 'N/A',
                'Date Logged': a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A',
                'Description / Message': a.description || 'N/A',
                'Resolution Remarks': cleanRemarks || 'N/A'
            };
        });
    }
    else if (type === 'penalties') {
        filename = 'Penalties.csv';
        dataToExport = penalties.map((p) => ({
            'Requirement': p.audit?.requirement?.requirement || 'N/A',
            'Reason': p.reason || 'N/A',
            'Suggested Penalty': p.amount || 'N/A',
            'Date Logged': (p.audit?.dueDate || p.audit?.createdAt) ? new Date(p.audit.dueDate || p.audit.createdAt).toLocaleDateString() : 'N/A',
            'Status': p.status === 'PENDING_PAYMENT' ? 'NON-COMPLIANT' : p.status === 'PAID' ? 'COMPLIANT' : p.status,
            'Resolved Date': p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A',
            'Remarks': p.remarks || 'N/A',
            'Proof URL': getFullUrl(p.proofUrl)
        }));
    }
    else if (type === 'complaints') {
        filename = 'Complaints.csv';
        dataToExport = complaints.map((c) => ({
            'SCORES ID': c.scoresRegNo || 'N/A',
            'Complainant': c.complainantName || 'N/A',
            'Date Received': c.dateReceived ? new Date(c.dateReceived).toLocaleDateString() : 'N/A',
            'Status': c.status || 'N/A',
            'Description': c.description || 'N/A',
            'ATR Remarks': c.atrRemarks || 'N/A',
            'ATR Proof': getFullUrl(c.atrProofUrl)
        }));
    }
    else if (type === 'overview') {
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
        if (initStep || tab === 'settings' || tab === 'dashboard') {
            try {
                const comp = await api.getProfileCompleteness();
                if (comp.success) {
                    setCompleteness(comp.data.score);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('tenant_completeness', String(comp.data.score));
                    }
                    setWizardDetails(comp.data.details);
                    const t = comp.data.data;
                    if (t) {
                        setTenantDetails(t);
                        if (t.logoUrl)
                            setTenantLogoUrl(t.logoUrl);
                        if (t.address)
                            setOrgAddress(t.address);
                        if (t.website)
                            setOrgWebsite(t.website);
                        if (t.mobile)
                            setOrgMobile(t.mobile);
                        if (t.gst)
                            setOrgGst(t.gst);
                        if (t.internalPolicyUrl)
                            setPolicyUrl(t.internalPolicyUrl);
                        if (t.termsPdfUrl)
                            setTermsPdfUrl(t.termsPdfUrl);
                        if (t.privacyPdfUrl)
                            setPrivacyPdfUrl(t.privacyPdfUrl);
                        if (t.gstCalculationType)
                            setGstCalculationType(t.gstCalculationType);
                        if (t.gstEnabled !== undefined)
                            setGstEnabled(t.gstEnabled !== false);
                        if (t.invoiceDispatchPolicy)
                            setInvoiceDispatchPolicy(t.invoiceDispatchPolicy);
                        if (t.l2ApprovalEnabled !== undefined)
                            setL2ApprovalEnabled(Boolean(t.l2ApprovalEnabled));
                        if (t.fileDownloadPolicy !== undefined)
                            setFileDownloadPolicy(t.fileDownloadPolicy);
                        if (t.fileDownloadNotificationEmail !== undefined)
                            setFileDownloadNotificationEmail(t.fileDownloadNotificationEmail || '');
                        if (t.maxEmailFileSizeMb !== undefined)
                            setMaxEmailFileSizeMb(Number(t.maxEmailFileSizeMb) || 10);
                        if (t.state)
                            setTenantState(t.state);
                        if (t.smtpHost)
                            setSmtpHost(t.smtpHost);
                        if (t.smtpPort)
                            setSmtpPort(t.smtpPort.toString());
                        if (t.smtpUser)
                            setSmtpUser(t.smtpUser);
                        if (t.smtpPassword)
                            setSmtpPassword(t.smtpPassword);
                        if (t.smtpFrom)
                            setSmtpFrom(t.smtpFrom);
                        if (t.ccInvoiceEnabled !== undefined)
                            setCcInvoiceEnabled(Boolean(t.ccInvoiceEnabled));
                        if (t.ccInvoiceEmail !== undefined)
                            setCcInvoiceEmail(t.ccInvoiceEmail || '');
                        if (t.ccAgreementEnabled !== undefined)
                            setCcAgreementEnabled(Boolean(t.ccAgreementEnabled));
                        if (t.ccAgreementEmail !== undefined)
                            setCcAgreementEmail(t.ccAgreementEmail || '');
                        if (t.bankAccountName)
                            setBankAccountName(t.bankAccountName);
                        if (t.bankAccountNo)
                            setBankAccountNo(t.bankAccountNo);
                        if (t.bankAccountType)
                            setBankAccountType(t.bankAccountType);
                        if (t.bankIfsc)
                            setBankIfsc(t.bankIfsc);
                        if (t.bankName)
                            setBankName(t.bankName);
                        if (t.bankBranch)
                            setBankBranch(t.bankBranch);
                        if (t.socialMediaLinks) {
                            try {
                                setSocialMediaLinks(JSON.parse(t.socialMediaLinks));
                            }
                            catch (e) { }
                        }
                        if (t.digioClientId)
                            setDigioClientId(t.digioClientId);
                        if (t.digioClientSecret)
                            setDigioClientSecret(t.digioClientSecret);
                        if (t.digioKycTemplateName)
                            setDigioKycTemplateName(t.digioKycTemplateName);
                        if (t.digioEnvironment)
                            setDigioEnvironment(t.digioEnvironment);
                        if (t.camsClientCode)
                            setCamsClientCode(t.camsClientCode);
                        if (t.camsClientId)
                            setCamsClientId(t.camsClientId);
                        if (t.camsClientSecret)
                            setCamsClientSecret(t.camsClientSecret);
                        if (t.camsPoscode)
                            setCamsPoscode(t.camsPoscode);
                        if (t.activePaymentGateway)
                            setActivePaymentGateway(t.activePaymentGateway);
                        if (t.razorpayKeyId)
                            setRazorpayKeyId(t.razorpayKeyId);
                        if (t.razorpayKeySecret)
                            setRazorpayKeySecret(t.razorpayKeySecret);
                        if (t.cashfreeAppId)
                            setCashfreeAppId(t.cashfreeAppId);
                        if (t.cashfreeSecretKey)
                            setCashfreeSecretKey(t.cashfreeSecretKey);
                        if (t.ccavenueMerchantId)
                            setCcavenueMerchantId(t.ccavenueMerchantId);
                        if (t.ccavenueAccessCode)
                            setCcavenueAccessCode(t.ccavenueAccessCode);
                        if (t.ccavenueWorkingKey)
                            setCcavenueWorkingKey(t.ccavenueWorkingKey);
                        if (t.stripePublishableKey)
                            setStripePublishableKey(t.stripePublishableKey);
                        if (t.stripeSecretKey)
                            setStripeSecretKey(t.stripeSecretKey);
                        if (t.paymentGatewayEnabled !== undefined)
                            setPaymentGatewayEnabled(Boolean(t.paymentGatewayEnabled));
                        if (t.upiQrEnabled !== undefined)
                            setUpiQrEnabled(Boolean(t.upiQrEnabled));
                        if (t.upiId)
                            setUpiId(t.upiId);
                        if (t.upiPayeeName)
                            setUpiPayeeName(t.upiPayeeName);
                        if (t.upiQrImageUrl)
                            setUpiQrImageUrl(t.upiQrImageUrl);
                        if (t.telegramTradeEnabled !== undefined)
                            setTelegramTradeEnabled(Boolean(t.telegramTradeEnabled));
                        if (t.smsTradeEnabled !== undefined)
                            setSmsTradeEnabled(Boolean(t.smsTradeEnabled));
                        if (t.telegramBotToken)
                            setTelegramBotToken(t.telegramBotToken);
                        if (t.telegramBotUsername)
                            setTelegramBotUsername(t.telegramBotUsername);
                        if (t.telegramJoinRule)
                            setTelegramJoinRule(t.telegramJoinRule);
                        if (t.agreementContent)
                            setAgreementContent(t.agreementContent);
                        if (t.welcomeEmailText)
                            setWelcomeEmailText(t.welcomeEmailText);
                        if (t.reportDisclaimer)
                            setReportDisclaimer(t.reportDisclaimer);
                        const po = t.users?.find((u) => u.role?.name === 'PRINCIPAL_OFFICER');
                        if (po) {
                            setPoName((po.firstName || '') + ' ' + (po.lastName || ''));
                            setPoEmail(po.email || '');
                            setPoMobile(po.mobile || '');
                            if (po.staff?.nismNumber)
                                setPoNism(po.staff.nismNumber);
                            if (po.staff?.nismValidity)
                                setPoValidity(new Date(po.staff.nismValidity).toISOString().split('T')[0]);
                        }
                        const co = t.users?.find((u) => u.role?.name === 'COMPLIANCE_OFFICER');
                        if (co) {
                            setCoName((co.firstName || '') + ' ' + (co.lastName || ''));
                            setCoEmail(co.email || '');
                            setCoMobile(co.mobile || '');
                            if (co.staff?.nismNumber)
                                setCoNism(co.staff.nismNumber);
                        }
                    }
                    if (initStep && comp.data.score < 80) {
                        const d = comp.data.details;
                        if (!d.organization)
                            setWizardStep(1);
                        else if (!d.principalOfficer)
                            setWizardStep(2);
                        else if (!d.complianceOfficer)
                            setWizardStep(3);
                        else if (!d.grievance)
                            setWizardStep(4);
                        else if (!d.internalPolicy)
                            setWizardStep(5);
                        else
                            setWizardStep(1);
                    }
                }
            }
            catch (err) {
                console.error('Failed to load profile completeness:', err);
            }
            finally {
                setIsCompletenessLoading(false);
            }
            try {
                const rolesReq = await api.getRoles();
                if (rolesReq.success) {
                    setRoles(rolesReq.data);
                    setSelectedRole((prev) => {
                        if (prev)
                            return prev;
                        const adminRole = rolesReq.data.find((r) => r.name === 'ADMIN');
                        return adminRole || rolesReq.data[0] || null;
                    });
                }
            }
            catch (e) { }
        }
        // Tab specific data loading
        if (tab === 'dashboard') {
            api.request('/admin/dashboard-stats').then(res => {
                if (res.success) {
                    setDashboardStats(res.data);
                    if (res.data?.isLive !== undefined)
                        setTenantIsLive(Boolean(res.data.isLive));
                    if (res.data?.goLiveAt)
                        setTenantGoLiveAt(res.data.goLiveAt);
                    if (res.data?.complianceCutoffDate)
                        setTenantCutoffDate(res.data.complianceCutoffDate);
                }
            }).catch(() => { });
            api.getTenantAuditLogs().then(res => {
                if (res.success)
                    setActivityLogs(res.data);
            }).catch(() => { });
            api.listAdminTickets().then(res => {
                if (res.success)
                    setAdminTickets(res.data);
            }).catch(() => { });
            api.getComplianceChecklist().then(res => {
                if (res.success && Array.isArray(res.data))
                    setChecklist(res.data);
            }).catch(() => { });
            api.getComplianceAlerts().then(res => {
                if (res.success && Array.isArray(res.data))
                    setAlerts(res.data);
            }).catch(() => { });
            api.getPenalties().then(res => {
                if (res.success && Array.isArray(res.data))
                    setPenalties(res.data);
            }).catch(() => { });
            api.getAdminClients().then(res => {
                if (res.success && Array.isArray(res.data))
                    setClients(res.data);
            }).catch(() => { });
            api.getComplianceChecklistHistory().then(res => {
                if (res.success && Array.isArray(res.data))
                    setChecklistHistory(res.data);
            }).catch(() => { });
        }
        if (tab === 'tickets') {
            api.listAdminTickets().then(res => {
                if (res.success)
                    setAdminTickets(res.data);
            }).catch(() => { });
        }
        if (tab === 'staff' || tab === 'roles') {
            api.getStaff().then(res => { if (res.success)
                setStaff(res.data); }).catch(() => { });
            fetchResearcherDscPermissions();
        }
        if (tab === 'clients') {
            api.getAdminClients().then(res => { if (res.success)
                setClients(res.data); }).catch(() => { });
            api.getAdminDeletedClients().then(res => { if (res.success)
                setDeletedClients(res.data); }).catch(() => { });
            api.getAdminCategories().then(res => { if (res.success)
                setCategories(res.data); }).catch(() => { });
            api.getAdminPlans().then(res => { if (res.success)
                setAdminPlans(res.data); }).catch(() => { });
        }
        if (tab === 'research') {
            api.listResearch().then(res => { if (res.success)
                setResearch(res.data); }).catch(() => { });
            api.getAdminCategories().then(res => { if (res.success)
                setCategories(res.data); }).catch(() => { });
            api.getAdminPlans().then(res => { if (res.success)
                setAdminPlans(res.data); }).catch(() => { });
        }
        if (tab === 'plans') {
            api.getAdminPlans().then(res => { if (res.success)
                setAdminPlans(res.data); }).catch(() => { });
            api.getAdminCategories().then(res => { if (res.success)
                setCategories(res.data); }).catch(() => { });
        }
        if (tab === 'compliance' || tab === 'checklist') {
            api.request('/compliance/complaints').then(res => { if (Array.isArray(res))
                setComplaints(res); }).catch(() => { });
            api.getComplianceAlerts().then(res => { if (res.success && Array.isArray(res.data))
                setAlerts(res.data); }).catch(() => { });
            api.getComplianceChecklist().then(res => { if (res.success)
                setChecklist(res.data); }).catch(() => { });
            api.getPenalties().then(res => { if (res.success)
                setPenalties(res.data); }).catch(() => { });
            api.getComplianceChecklistHistory().then(res => { if (res.success)
                setChecklistHistory(res.data); }).catch(() => { });
        }
        if (initStep || tab === 'payments' || tab === 'l2-approvals' || tab === 'dashboard') {
            api.getAdminPayments().then(res => { if (res.success)
                setAllPayments(res.data); }).catch(() => { });
        }
        if (initStep || tab === 'auditLogs' || tab === 'dashboard') {
            setLoadingAuditLogs(true);
            api.getTenantAuditLogs().then(res => {
                if (res.success && Array.isArray(res.data))
                    setActivityLogs(res.data);
            }).catch(() => { }).finally(() => {
                setLoadingAuditLogs(false);
            });
        }
    }
    catch (err) {
        console.error('Failed to load dashboard data:', err);
    }
    finally {
        if (initStep)
            setLoading(false);
    }
};
useEffect(() => {
    if (!loading) {
        loadData(false);
    }
}, [activeTab]);
// Real-time auto-refresh for L2 queue and payments desk
useEffect(() => {
    const pollTimer = setInterval(() => {
        api.getAdminPayments().then(res => {
            if (res?.success && Array.isArray(res.data)) {
                setAllPayments(prev => {
                    if (prev.length !== res.data.length ||
                        (prev[0] && res.data[0] && (prev[0].id !== res.data[0].id || prev[0].approvalStatus !== res.data[0].approvalStatus))) {
                        return res.data;
                    }
                    return prev;
                });
            }
        }).catch(() => { });
    }, 6000);
    return () => clearInterval(pollTimer);
}, []);
const salesAndClientChartData = useMemo(() => {
    const formatPeriod = (dateStr, timeframe) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return timeframe === 'yearly' ? new Date().getFullYear().toString() : 'Oct 26';
        if (timeframe === 'yearly') {
            return d.getFullYear().toString();
        }
        else {
            return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }
    };
    const timeframe = dashboardTimeframe;
    const metric = dashboardMetric;
    const dataMap = new Map();
    if (metric === 'sales') {
        allPayments.forEach((p) => {
            if (p.status === 'SUCCESS' || p.paymentMode === 'ADMIN_ASSIGNED') {
                const key = formatPeriod(p.createdAt, timeframe);
                dataMap.set(key, (dataMap.get(key) || 0) + Number(p.amount || 0));
            }
        });
    }
    else {
        clients.forEach((c) => {
            const rawDate = c.createdAt || c.user?.createdAt || new Date();
            const key = formatPeriod(rawDate, timeframe);
            dataMap.set(key, (dataMap.get(key) || 0) + 1);
        });
    }
    const sortedKeys = Array.from(dataMap.keys()).sort((a, b) => {
        if (timeframe === 'yearly') {
            return (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);
        }
        const parseMonthKey = (s) => {
            const parts = s.split(' ');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = months.indexOf(parts[0]);
            const year = 2000 + (parseInt(parts[1], 10) || 0);
            return year * 12 + (monthIndex >= 0 ? monthIndex : 0);
        };
        return parseMonthKey(a) - parseMonthKey(b);
    });
    return sortedKeys.map(key => ({
        period: key,
        value: dataMap.get(key) || 0
    }));
}, [allPayments, clients, dashboardTimeframe, dashboardMetric]);
// Paginators
const getFinancialYear = (dateString) => {
    if (!dateString)
        return 'Unknown';
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = d.getMonth();
    if (month >= 3) {
        return `FY ${year}-${(year + 1).toString().slice(-2)}`;
    }
    else {
        return `FY ${year - 1}-${year.toString().slice(-2)}`;
    }
};
const availableFinancialYears = useMemo(() => {
    const years = new Set();
    checklistHistory.forEach((h) => years.add(getFinancialYear(h.createdAt)));
    alerts.forEach((a) => years.add(getFinancialYear(a.createdAt)));
    complaints.forEach((c) => years.add(getFinancialYear(c.receivedAt)));
    penalties.forEach((p) => years.add(getFinancialYear(p.createdAt || p.audit?.createdAt)));
    return Array.from(years).filter(y => y !== 'Unknown').sort().reverse();
}, [checklistHistory, alerts, complaints, penalties]);
const topLevelFilteredHistory = useMemo(() => {
    return checklistHistory.filter((h) => {
        const matchesText = h.requirement?.requirement?.toLowerCase().includes(historyFilterText.toLowerCase());
        const matchesFY = selectedFinancialYear === 'All' || getFinancialYear(h.createdAt) === selectedFinancialYear;
        return matchesText && matchesFY;
    });
}, [checklistHistory, historyFilterText, selectedFinancialYear]);
const historyPagination = usePagination(topLevelFilteredHistory, 10);
useEffect(() => {
    // Safety fallback so the dashboard never gets stuck on the loading spinner
    const safetyTimer = setTimeout(() => {
        setLoading(false);
    }, 6000);
    if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            setLoading(false);
            router.replace('/admin/login?error=expired');
            return () => clearTimeout(safetyTimer);
        }
        try {
            const u = JSON.parse(userStr);
            setUser(u);
            if (u?.tenant?.isLive !== undefined)
                setTenantIsLive(Boolean(u.tenant.isLive));
            if (u?.tenant?.goLiveAt)
                setTenantGoLiveAt(u.tenant.goLiveAt);
            if (u?.tenant?.complianceCutoffDate)
                setTenantCutoffDate(u.tenant.complianceCutoffDate);
            if (u?.role === 'COMPLIANCE_OFFICER')
                setActiveTab('compliance');
            else if (u?.role === 'RESEARCHER' || u?.role === 'PRINCIPAL_OFFICER')
                setActiveTab('research');
        }
        catch (e) {
            console.error('Invalid user in localStorage:', e);
        }
        api.getCurrentUser().then(res => {
            if (res.success) {
                const syncedUser = res.data.user;
                const currentUserStr = localStorage.getItem('user');
                const currentU = currentUserStr ? JSON.parse(currentUserStr) : null;
                if (currentU?.isImpersonated) {
                    syncedUser.isImpersonated = true;
                }
                if (!syncedUser.tenantLogo && syncedUser.tenant?.logoUrl) {
                    syncedUser.tenantLogo = syncedUser.tenant.logoUrl;
                }
                if (!syncedUser.tenantName && syncedUser.tenant?.companyName) {
                    syncedUser.tenantName = syncedUser.tenant.companyName;
                }
                if (syncedUser.tenant?.isLive !== undefined)
                    setTenantIsLive(Boolean(syncedUser.tenant.isLive));
                if (syncedUser.tenant?.goLiveAt)
                    setTenantGoLiveAt(syncedUser.tenant.goLiveAt);
                if (syncedUser.tenant?.complianceCutoffDate)
                    setTenantCutoffDate(syncedUser.tenant.complianceCutoffDate);
                setUser(syncedUser);
                localStorage.setItem('user', JSON.stringify(syncedUser));
                const isAllowed = (tab) => {
                    if (syncedUser.role === 'SUPER_ADMIN' || syncedUser.role === 'ADMIN')
                        return true;
                    if (tab === 'checklist') {
                        return syncedUser.permissions?.includes('ACCESS_CHECKLIST') || syncedUser.permissions?.includes('ACCESS_COMPLIANCE') || false;
                    }
                    const permMap = {
                        dashboard: 'ACCESS_DASHBOARD',
                        checklist: 'ACCESS_CHECKLIST',
                        staff: 'ACCESS_STAFF',
                        clients: 'ACCESS_CLIENTS',
                        plans: 'ACCESS_PLANS',
                        research: 'ACCESS_RESEARCH',
                        payments: 'ACCESS_PAYMENTS',
                        compliance: 'ACCESS_COMPLIANCE',
                        settings: 'ACCESS_SETTINGS',
                        roles: 'ACCESS_ROLES',
                        tickets: 'ACCESS_TICKETS',
                        signature_settings: 'ACCESS_PERSONAL_SETTINGS',
                        resources: 'ACCESS_RESOURCES'
                    };
                    const perm = permMap[tab];
                    if (!perm)
                        return true;
                    return syncedUser.permissions?.includes(perm) || false;
                };
                const tabs = ['dashboard', 'staff', 'clients', 'plans', 'research', 'payments', 'compliance', 'settings', 'signature_settings', 'roles', 'tickets', 'resources'];
                const currentTab = activeTab;
                if (!isAllowed(currentTab)) {
                    for (const t of tabs) {
                        if (isAllowed(t)) {
                            setActiveTab(t);
                            break;
                        }
                    }
                }
            }
        }).catch(err => console.error('Failed to sync user details:', err));
    }
    loadData(true);
    return () => clearTimeout(safetyTimer);
}, []);
useEffect(() => {
    if (user) {
        if (hasPermission('ACCESS_SETTINGS')) {
            api.request('/admin/pages').then(res => {
                if (res.success)
                    setAdminPagesList(res.data);
            }).catch(() => { });
        }
        else {
            // Fetch active pages for non-admin to view in Legal tab
            api.request('/pages').then(res => {
                if (res.success)
                    setAdminPagesList(res.data);
            }).catch(() => { });
        }
    }
}, [user]);
useEffect(() => {
    if (user?.role) {
        const isAllowed = (tab) => {
            if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')
                return true;
            if (tab === 'checklist' || tab === 'penalty-matrix') {
                return user.permissions?.includes('ACCESS_CHECKLIST') || user.permissions?.includes('ACCESS_COMPLIANCE') || false;
            }
            const permMap = {
                dashboard: 'ACCESS_DASHBOARD',
                checklist: 'ACCESS_CHECKLIST',
                'penalty-matrix': 'ACCESS_CHECKLIST',
                staff: 'ACCESS_STAFF',
                clients: 'ACCESS_CLIENTS',
                plans: 'ACCESS_PLANS',
                research: 'ACCESS_RESEARCH',
                payments: 'ACCESS_PAYMENTS',
                compliance: 'ACCESS_COMPLIANCE',
                settings: 'ACCESS_SETTINGS',
                roles: 'ACCESS_ROLES',
                tickets: 'ACCESS_TICKETS',
                signature_settings: 'ACCESS_PERSONAL_SETTINGS',
                resources: 'ACCESS_RESOURCES'
            };
            const perm = permMap[tab];
            if (!perm)
                return true;
            return user.permissions?.includes(perm) || false;
        };
        let desiredTab = '';
        const hashTab = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
        if (hashTab && isAllowed(hashTab)) {
            desiredTab = hashTab;
        }
        else {
            desiredTab = user.role === 'COMPLIANCE_OFFICER' ? 'compliance' : (['RESEARCHER', 'PRINCIPAL_OFFICER'].includes(user.role) ? 'research' : 'dashboard');
        }
        if (isAllowed(desiredTab)) {
            setActiveTab(desiredTab);
        }
        else {
            const tabs = ['dashboard', 'staff', 'clients', 'plans', 'research', 'payments', 'compliance', 'settings', 'signature_settings', 'roles', 'tickets', 'resources'];
            for (const t of tabs) {
                if (isAllowed(t)) {
                    setActiveTab(t);
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
const handleCreateCategory = async (e) => {
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
    }
    catch (err) {
        toast(err.message);
    }
};
const handleToggleCategoryStatus = (id) => {
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
                if (res.success)
                    loadData();
            }
            catch (err) {
                toast(err.message);
            }
        }
    });
};
const handleTogglePlanStatus = (id) => {
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
                if (res.success)
                    loadData();
            }
            catch (err) {
                toast(err.message);
            }
        }
    });
};
const handleDeletePlan = (id) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to delete plan.');
            }
        }
    });
};
const handleRestorePlan = (id) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to restore plan.');
            }
        }
    });
};
const [uploadingAvatar, setUploadingAvatar] = useState(false);
const [showMobilePreview, setShowMobilePreview] = useState(false);
useEffect(() => {
    if (selectedClient) {
        const p = selectedClient.pan?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.pan || '';
        setCamsPanInput(p);
        let d = '';
        if (selectedClient.dob) {
            if (typeof selectedClient.dob === 'string') {
                d = selectedClient.dob.split('T')[0];
            }
            else if (selectedClient.dob instanceof Date) {
                d = selectedClient.dob.toISOString().split('T')[0];
            }
        }
        setCamsDobInput(d);
        setFetchCamsResult(null);
        setFetchCamsError('');
        setCamsEditMode(false);
        setViewClientIsTelegramTradeEnabled(selectedClient.isTelegramTradeEnabled !== false);
        setViewClientIsSmsTradeEnabled(selectedClient.isSmsTradeEnabled !== false);
        setViewClientTelegramChatId(selectedClient.telegramChatId || '');
        setViewClientTelegramUsername(selectedClient.telegramUsername || '');
        setShowManualDigioFetch(false);
    }
    if (selectedClient && selectedClient.id) {
        api.getClientCommunicationsAdmin(selectedClient.id)
            .then(res => setClientCommunications(res.data || []))
            .catch(() => setClientCommunications([]));
    }
    else {
        setClientCommunications([]);
    }
}, [selectedClient]);
useEffect(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('showMobilePreview');
        if (saved !== null)
            setShowMobilePreview(saved === 'true');
    }
}, []);
const toggleMobilePreview = () => {
    const newVal = !showMobilePreview;
    setShowMobilePreview(newVal);
    localStorage.setItem('showMobilePreview', newVal.toString());
};
const handleTestSmtp = async () => {
    if (!testSmtpEmail || !testSmtpEmail.trim()) {
        toast.error('Please enter the Test Email Address to receive the test email');
        return;
    }
    setIsTestingSmtp(true);
    try {
        const data = await api.testSmtpConnection({
            host: smtpHost,
            port: smtpPort,
            user: smtpUser,
            password: smtpPassword,
            testEmail: testSmtpEmail.trim()
        });
        if (data.success) {
            toast.success(data.message || 'Test email sent successfully! Please check your inbox.');
        }
        else {
            toast.error(data.message || 'Failed to send test email');
        }
    }
    catch (err) {
        toast.error(err.message || 'Error connecting to SMTP server');
    }
    finally {
        setIsTestingSmtp(false);
    }
};
const handleSaveSettings = async () => {
    try {
        if (gstEnabled && (!orgGst || orgGst.trim().length < 15)) {
            toast.error('GST is enabled. A valid 15-character Company GSTIN is mandatory.');
            const gstInput = document.getElementById('company-gstin-input');
            if (gstInput) {
                gstInput.focus();
                gstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        const formData = new FormData();
        formData.append('gstEnabled', String(gstEnabled));
        formData.append('gstCalculationType', gstCalculationType);
        formData.append('invoiceDispatchPolicy', invoiceDispatchPolicy);
        formData.append('l2ApprovalEnabled', String(l2ApprovalEnabled));
        formData.append('fileDownloadPolicy', fileDownloadPolicy);
        if (fileDownloadNotificationEmail)
            formData.append('fileDownloadNotificationEmail', fileDownloadNotificationEmail.trim());
        formData.append('maxEmailFileSizeMb', String(maxEmailFileSizeMb));
        formData.append('gst', orgGst);
        formData.append('state', tenantState);
        formData.append('address', orgAddress);
        formData.append('mobile', orgMobile);
        formData.append('website', orgWebsite);
        formData.append('kycFirst', String(kycFirst));
        formData.append('welcomeEmailText', welcomeEmailText);
        formData.append('reportDisclaimer', reportDisclaimer);
        if (termsPdf)
            formData.append('termsPdf', termsPdf);
        if (internalPolicyPdf)
            formData.append('internalPolicyPdf', internalPolicyPdf);
        if (logoFile)
            formData.append('logo', logoFile);
        if (privacyPdf)
            formData.append('privacyPdf', privacyPdf);
        formData.append('smtpHost', (smtpHost || '').trim());
        formData.append('smtpPort', (smtpPort || '').toString().trim());
        formData.append('smtpUser', (smtpUser || '').trim());
        if (smtpPassword && smtpPassword.trim()) {
            formData.append('smtpPassword', smtpPassword.trim());
        }
        formData.append('smtpFrom', (smtpFrom || smtpUser || '').trim());
        formData.append('ccInvoiceEnabled', String(ccInvoiceEnabled));
        formData.append('ccInvoiceEmail', (ccInvoiceEmail || '').trim());
        formData.append('ccAgreementEnabled', String(ccAgreementEnabled));
        formData.append('ccAgreementEmail', (ccAgreementEmail || '').trim());
        if (bankAccountName)
            formData.append('bankAccountName', bankAccountName);
        if (bankAccountNo)
            formData.append('bankAccountNo', bankAccountNo);
        if (bankAccountType)
            formData.append('bankAccountType', bankAccountType);
        if (bankIfsc)
            formData.append('bankIfsc', bankIfsc);
        if (bankName)
            formData.append('bankName', bankName);
        if (bankBranch)
            formData.append('bankBranch', bankBranch);
        if (socialMediaLinks.length > 0)
            formData.append('socialMediaLinks', JSON.stringify(socialMediaLinks));
        if (digioClientId)
            formData.append('digioClientId', digioClientId);
        if (digioClientSecret)
            formData.append('digioClientSecret', digioClientSecret);
        if (digioKycTemplateName)
            formData.append('digioKycTemplateName', digioKycTemplateName);
        if (digioEnvironment)
            formData.append('digioEnvironment', digioEnvironment);
        if (camsClientCode)
            formData.append('camsClientCode', camsClientCode);
        if (camsClientId)
            formData.append('camsClientId', camsClientId);
        if (camsClientSecret)
            formData.append('camsClientSecret', camsClientSecret);
        if (camsPoscode)
            formData.append('camsPoscode', camsPoscode);
        if (activePaymentGateway)
            formData.append('activePaymentGateway', activePaymentGateway);
        if (razorpayKeyId)
            formData.append('razorpayKeyId', razorpayKeyId);
        if (razorpayKeySecret)
            formData.append('razorpayKeySecret', razorpayKeySecret);
        if (cashfreeAppId)
            formData.append('cashfreeAppId', cashfreeAppId);
        if (cashfreeSecretKey)
            formData.append('cashfreeSecretKey', cashfreeSecretKey);
        if (ccavenueMerchantId)
            formData.append('ccavenueMerchantId', ccavenueMerchantId);
        if (ccavenueAccessCode)
            formData.append('ccavenueAccessCode', ccavenueAccessCode);
        if (ccavenueWorkingKey)
            formData.append('ccavenueWorkingKey', ccavenueWorkingKey);
        if (stripePublishableKey)
            formData.append('stripePublishableKey', stripePublishableKey);
        if (stripeSecretKey)
            formData.append('stripeSecretKey', stripeSecretKey);
        formData.append('paymentGatewayEnabled', String(paymentGatewayEnabled));
        formData.append('upiQrEnabled', String(upiQrEnabled));
        formData.append('upiId', (upiId || '').trim());
        formData.append('upiPayeeName', (upiPayeeName || '').trim());
        formData.append('upiInstructions', (upiInstructions || '').trim());
        if (upiQrImageFile) {
            formData.append('upiQrImage', upiQrImageFile);
        }
        if (agreementContent)
            formData.append('agreementContent', agreementContent);
        // Telegram & SMS Trade Dispatch Settings
        formData.append('telegramTradeEnabled', String(telegramTradeEnabled));
        formData.append('smsTradeEnabled', String(smsTradeEnabled));
        if (telegramBotToken)
            formData.append('telegramBotToken', telegramBotToken.trim());
        if (telegramBotUsername)
            formData.append('telegramBotUsername', telegramBotUsername.trim().replace(/^@/, ''));
        formData.append('telegramJoinRule', telegramJoinRule);
        const data = await api.updateTenantSettings(formData);
        if (data.success) {
            toast.success('Settings and logo saved successfully!');
            if (data.data) {
                if (data.data.logoUrl) {
                    setTenantLogoUrl(data.data.logoUrl);
                }
                if (data.data.upiQrImageUrl) {
                    setUpiQrImageUrl(data.data.upiQrImageUrl);
                    setUpiQrImageFile(null);
                    setUpiQrImagePreview('');
                }
                if (data.data.smtpHost)
                    setSmtpHost(data.data.smtpHost);
                if (data.data.smtpPort)
                    setSmtpPort(data.data.smtpPort.toString());
                if (data.data.smtpUser)
                    setSmtpUser(data.data.smtpUser);
                if (data.data.smtpPassword)
                    setSmtpPassword(data.data.smtpPassword);
                if (data.data.smtpFrom)
                    setSmtpFrom(data.data.smtpFrom);
                if (data.data.ccInvoiceEnabled !== undefined)
                    setCcInvoiceEnabled(Boolean(data.data.ccInvoiceEnabled));
                if (data.data.ccInvoiceEmail !== undefined)
                    setCcInvoiceEmail(data.data.ccInvoiceEmail || '');
                if (data.data.ccAgreementEnabled !== undefined)
                    setCcAgreementEnabled(Boolean(data.data.ccAgreementEnabled));
                if (data.data.ccAgreementEmail !== undefined)
                    setCcAgreementEmail(data.data.ccAgreementEmail || '');
                if (data.data.telegramTradeEnabled !== undefined)
                    setTelegramTradeEnabled(Boolean(data.data.telegramTradeEnabled));
                if (data.data.smsTradeEnabled !== undefined)
                    setSmsTradeEnabled(Boolean(data.data.smsTradeEnabled));
                if (data.data.telegramBotToken !== undefined)
                    setTelegramBotToken(data.data.telegramBotToken || '');
                if (data.data.telegramBotUsername !== undefined)
                    setTelegramBotUsername(data.data.telegramBotUsername || '');
                if (data.data.telegramJoinRule !== undefined)
                    setTelegramJoinRule(data.data.telegramJoinRule || 'ACTIVE_PLAN_ONLY');
                setUser((prevUser) => {
                    const updatedUser = { ...prevUser, tenant: data.data };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    return updatedUser;
                });
            }
            setLogoFile(null);
            if (refreshBranding)
                await refreshBranding();
            await loadData(true);
        }
        else {
            toast.error(data.message || 'Failed to save settings');
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to save settings');
    }
};
// ── GST TOGGLE FLOW WITH CONFIRMATION & DIRECT PERSISTENCE ──
const handleTriggerGstToggle = (targetState) => {
    if (targetState === gstEnabled)
        return;
    if (targetState === true) {
        if (!orgGst || orgGst.trim().length < 15) {
            setGstEnabled(true);
            toast('GST Mode activated. Please enter your 15-character Company GSTIN below and click Save Settings.', {
                icon: 'ℹ️'
            });
            setTimeout(() => {
                const gstInput = document.getElementById('company-gstin-input');
                if (gstInput) {
                    gstInput.focus();
                    gstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }
    }
    setPendingGstTargetState(targetState);
    setIsGstConfirmModalOpen(true);
};
const handleConfirmGstToggle = async () => {
    if (pendingGstTargetState === null)
        return;
    setIsSavingGstToggle(true);
    try {
        const formData = new FormData();
        formData.append('gstEnabled', String(pendingGstTargetState));
        formData.append('gstCalculationType', gstCalculationType);
        formData.append('invoiceDispatchPolicy', invoiceDispatchPolicy);
        formData.append('l2ApprovalEnabled', String(l2ApprovalEnabled));
        formData.append('fileDownloadPolicy', fileDownloadPolicy);
        if (fileDownloadNotificationEmail)
            formData.append('fileDownloadNotificationEmail', fileDownloadNotificationEmail.trim());
        formData.append('maxEmailFileSizeMb', String(maxEmailFileSizeMb));
        formData.append('gst', (orgGst || '').trim());
        formData.append('state', tenantState || '');
        formData.append('address', orgAddress || '');
        formData.append('mobile', orgMobile || '');
        formData.append('website', orgWebsite || '');
        formData.append('kycFirst', String(kycFirst));
        formData.append('welcomeEmailText', welcomeEmailText || '');
        formData.append('reportDisclaimer', reportDisclaimer || '');
        formData.append('paymentGatewayEnabled', String(paymentGatewayEnabled));
        formData.append('upiQrEnabled', String(upiQrEnabled));
        formData.append('upiId', (upiId || '').trim());
        formData.append('upiPayeeName', (upiPayeeName || '').trim());
        formData.append('upiInstructions', (upiInstructions || '').trim());
        const data = await api.updateTenantSettings(formData);
        if (data && data.success) {
            setGstEnabled(pendingGstTargetState);
            toast.success(pendingGstTargetState
                ? 'GST calculation enabled (18% tax mode).'
                : 'GST calculation disabled (0% tax Non-GST Advisor mode).');
            setIsGstConfirmModalOpen(false);
            setPendingGstTargetState(null);
            await loadData(true);
        }
        else {
            throw new Error(data?.message || 'Failed to update GST settings');
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to update GST settings');
    }
    finally {
        setIsSavingGstToggle(false);
    }
};
// ── KYC ONBOARDING FLOW TOGGLE WITH CONFIRMATION & DIRECT PERSISTENCE ──
const handleTriggerKycFlowToggle = (targetState) => {
    if (targetState === kycFirst)
        return;
    setPendingKycFirstState(targetState);
    setIsKycFlowConfirmModalOpen(true);
};
const handleConfirmKycFlowToggle = async () => {
    if (pendingKycFirstState === null)
        return;
    setIsSavingKycFlowToggle(true);
    try {
        const formData = new FormData();
        formData.append('kycFirst', String(pendingKycFirstState));
        formData.append('gstEnabled', String(gstEnabled));
        formData.append('gstCalculationType', gstCalculationType);
        formData.append('invoiceDispatchPolicy', invoiceDispatchPolicy);
        formData.append('l2ApprovalEnabled', String(l2ApprovalEnabled));
        formData.append('fileDownloadPolicy', fileDownloadPolicy);
        if (fileDownloadNotificationEmail)
            formData.append('fileDownloadNotificationEmail', fileDownloadNotificationEmail.trim());
        formData.append('maxEmailFileSizeMb', String(maxEmailFileSizeMb));
        formData.append('gst', (orgGst || '').trim());
        formData.append('state', tenantState || '');
        formData.append('address', orgAddress || '');
        formData.append('mobile', orgMobile || '');
        formData.append('website', orgWebsite || '');
        formData.append('welcomeEmailText', welcomeEmailText || '');
        formData.append('reportDisclaimer', reportDisclaimer || '');
        formData.append('paymentGatewayEnabled', String(paymentGatewayEnabled));
        formData.append('upiQrEnabled', String(upiQrEnabled));
        formData.append('upiId', (upiId || '').trim());
        formData.append('upiPayeeName', (upiPayeeName || '').trim());
        formData.append('upiInstructions', (upiInstructions || '').trim());
        const data = await api.updateTenantSettings(formData);
        if (data && data.success) {
            setKycFirst(pendingKycFirstState);
            toast.success(pendingKycFirstState
                ? 'Client onboarding flow set to: KYC Before Payment.'
                : 'Client onboarding flow set to: KYC After Payment.');
            setIsKycFlowConfirmModalOpen(false);
            setPendingKycFirstState(null);
            await loadData(true);
        }
        else {
            throw new Error(data?.message || 'Failed to update onboarding flow');
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to update onboarding flow');
    }
    finally {
        setIsSavingKycFlowToggle(false);
    }
};
const handleSaveTradeDispatchSettings = async () => {
    setSavingTradeDispatch(true);
    try {
        const formData = new FormData();
        formData.append('telegramTradeEnabled', String(telegramTradeEnabled));
        formData.append('smsTradeEnabled', String(smsTradeEnabled));
        formData.append('telegramBotToken', telegramBotToken.trim());
        formData.append('telegramBotUsername', telegramBotUsername.trim().replace(/^@/, ''));
        formData.append('telegramJoinRule', telegramJoinRule);
        const res = await api.updateTenantSettings(formData);
        if (res && res.success) {
            toast.success('Trade Dispatch & Bot Settings saved successfully!');
            loadData();
        }
        else {
            toast.error(res?.message || 'Failed to save Trade Dispatch settings');
        }
    }
    catch (err) {
        toast.error(err.message || 'Error saving settings');
    }
    finally {
        setSavingTradeDispatch(false);
    }
};
const handleTestTelegramBot = async () => {
    if (!telegramBotToken.trim()) {
        toast.error('Please enter a Telegram Bot Token to test.');
        return;
    }
    setTestingBot(true);
    setBotTestResult(null);
    try {
        const res = await api.testTelegramBot(telegramBotToken.trim());
        if (res.success) {
            setBotTestResult({ success: true, message: res.message });
            if (res.bot?.username) {
                setTelegramBotUsername(res.bot.username);
            }
            toast.success(res.message);
        }
        else {
            setBotTestResult({ success: false, message: res.message || 'Bot connection failed' });
            toast.error(res.message || 'Bot connection failed');
        }
    }
    catch (err) {
        setBotTestResult({ success: false, message: err.message || 'Failed to connect to Telegram' });
        toast.error(err.message || 'Failed to connect to Telegram');
    }
    finally {
        setTestingBot(false);
    }
};
const handleVerifyPaymentGateway = async () => {
    setVerifyingGateway(true);
    setGatewayVerifyResult(null);
    try {
        const res = await api.verifyPaymentGateway({
            gateway: activePaymentGateway,
            razorpayKeyId,
            razorpayKeySecret,
            cashfreeAppId,
            cashfreeSecretKey,
            ccavenueMerchantId,
            ccavenueAccessCode,
            ccavenueWorkingKey,
            stripePublishableKey,
            stripeSecretKey
        });
        if (res.success) {
            setGatewayVerifyResult({
                success: true,
                message: res.message || 'Payment Gateway Verified Successfully!',
                mode: res.mode
            });
            toast.success(res.message || 'Payment Gateway connection verified!');
        }
        else {
            setGatewayVerifyResult({
                success: false,
                message: res.message || 'Payment Gateway Verification Failed.'
            });
            toast.error(res.message || 'Verification failed');
        }
    }
    catch (err) {
        const errMsg = err?.message || 'Failed to verify payment gateway connection.';
        setGatewayVerifyResult({
            success: false,
            message: errMsg
        });
        toast.error(errMsg);
    }
    finally {
        setVerifyingGateway(false);
    }
};
const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (profileNewPassword !== profileConfirmPassword) {
        toast('New passwords do not match!');
        return;
    }
    if (!profileNewPassword || profileNewPassword.length < 8 || profileNewPassword.length > 15) {
        toast('Password must be between 8 and 15 characters.');
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
        }
        else {
            toast.error(res.message || 'Failed to change password');
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to change password');
    }
    finally {
        setIsChangingPassword(false);
    }
};
const getCalculatedCutoffInfo = () => {
    const today = new Date();
    const currentDay = today.getDate();
    let cutoff;
    let ruleExplanation = '';
    if (currentDay >= 1 && currentDay <= 14) {
        cutoff = new Date(today.getFullYear(), today.getMonth(), 15);
        ruleExplanation = `Since today is day ${currentDay} (between 1st-14th), periodic calendar tasks & BSE disclosures will officially begin on the 15th of this month (${cutoff.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}). All prior test penalties are waived.`;
    }
    else {
        cutoff = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        ruleExplanation = `Since today is day ${currentDay} (between 15th-31st), routine calendar checklist & monthly BSE disclosures will officially begin on the 1st of next month (${cutoff.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}). All prior test penalties are waived.`;
    }
    return { cutoff, ruleExplanation, currentDay };
};
const handleConfirmGoLive = async () => {
    if (!goLivePassword || !goLivePassword.trim()) {
        toast.error('Please enter your Admin password to authorize Go-Live.');
        return;
    }
    setIsSubmittingGoLive(true);
    try {
        const res = await api.goLiveTenant(goLivePassword);
        if (res.success) {
            setTenantIsLive(true);
            if (res.data?.goLiveAt)
                setTenantGoLiveAt(res.data.goLiveAt);
            if (res.data?.complianceCutoffDate)
                setTenantCutoffDate(res.data.complianceCutoffDate);
            setUser((prev) => {
                const updated = {
                    ...prev,
                    tenant: {
                        ...(prev?.tenant || {}),
                        isLive: true,
                        goLiveAt: res.data?.goLiveAt,
                        complianceCutoffDate: res.data?.complianceCutoffDate
                    }
                };
                localStorage.setItem('user', JSON.stringify(updated));
                return updated;
            });
            toast.success(res.message || '🎉 Portal successfully launched to LIVE production!');
            setIsGoLiveModalOpen(false);
            setGoLivePassword('');
            // Reload data for current active tab
            loadData(true);
        }
        else {
            toast.error(res.message || 'Incorrect password. Go-Live failed.');
        }
    }
    catch (err) {
        toast.error(err?.message || 'Server error while taking portal live.');
    }
    finally {
        setIsSubmittingGoLive(false);
    }
};
const handleLogout = async (allDevices = false) => {
    await api.logout(allDevices);
    router.push('/admin/login');
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
const handleSaveWizardStep = async (stepName, data) => {
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
    }
    else if (stepName === 'PO') {
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
    }
    else if (stepName === 'CO') {
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
            const newScore = res.data.score;
            const newDetails = res.data.details;
            setCompleteness(newScore);
            setWizardDetails(newDetails);
            // Navigate to next incomplete step (or dashboard if complete)
            if (newScore >= 80) {
                // Profile is complete — isProfileComplete becomes true and dashboard renders
                // Optionally refresh other dashboard data in background
                loadData();
            }
            else {
                // Move to first incomplete step
                if (!newDetails.organization)
                    setWizardStep(1);
                else if (!newDetails.principalOfficer)
                    setWizardStep(2);
                else if (!newDetails.complianceOfficer)
                    setWizardStep(3);
                else if (!newDetails.grievance)
                    setWizardStep(4);
                else if (!newDetails.internalPolicy)
                    setWizardStep(5);
            }
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to save step.');
    }
};
const resetStaffForm = () => {
    setStaffName('');
    setStaffUsername('');
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
    setStaffDscScope('DISABLED');
    setEditingStaff(null);
};
const handleStaffNismFileChange = async (e) => {
    const inputElement = e.target;
    const file = inputElement.files?.[0] || null;
    setStaffNismFile(null);
    setStaffNismParsed(null);
    setNismParseMsg('');
    if (!file)
        return;
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension || '')) {
        toast('Only image formats (PNG, JPG, JPEG) and PDF files are allowed.');
        inputElement.value = '';
        return;
    }
    setStaffNismFile(file);
    // Only auto-parse if it's a PDF
    if (file.type !== 'application/pdf')
        return;
    setIsParsingStaffNism(true);
    setNismParseMsg('');
    try {
        const formData = new FormData();
        formData.append('nismCertificate', file);
        const res = await api.adminParseNismCertificate(formData);
        if (res.success && res.data) {
            setStaffNismParsed(res.data);
            // Auto-fill whatever fields were extracted (editable by user)
            if (res.data.nismRegistration)
                setStaffNism(res.data.nismRegistration);
            if (res.data.nismValidity)
                setStaffNismValidity(res.data.nismValidity);
            if (res.data.name)
                setStaffName(res.data.name);
            setNismParseMsg(res.data.nismRegistration
                ? '✅ Details auto-filled from certificate'
                : '⚠️ Partial data extracted — please verify and fill remaining fields');
        }
        else {
            // Graceful fallback — no alert popup, just soft message
            setNismParseMsg(res.message || 'PDF uploaded. Please fill in NISM details manually.');
        }
    }
    catch (err) {
        setNismParseMsg('PDF uploaded. Please fill in NISM details manually.');
    }
    finally {
        setIsParsingStaffNism(false);
    }
};
const fetchResearcherDscPermissions = async () => {
    try {
        setLoadingResearcherDsc(true);
        const res = await api.getResearcherDscPermissions();
        if (res && res.success && Array.isArray(res.data)) {
            setResearcherDscList(res.data);
        }
    }
    catch (err) {
        console.warn('Failed to fetch researcher DSC permissions:', err);
    }
    finally {
        setLoadingResearcherDsc(false);
    }
};
const handleUpdateDscScope = async (researcherId, researcherName, newScope) => {
    try {
        setUpdatingDscScopeId(researcherId);
        const res = await api.updateResearcherDscPermission(researcherId, newScope);
        if (res && res.success) {
            const scopeLabels = {
                ALL: 'ALL (Shared Master DSC for all researchers)',
                SELF: 'SELF (Personal Self-Login Only)',
                DISABLED: 'DISABLED (Signing Blocked)'
            };
            toast.success(`Updated DSC Permission for ${researcherName} to: ${scopeLabels[newScope] || newScope}`);
            setResearcherDscList(prev => prev.map(r => (r.id === researcherId || r.userId === researcherId || r.staffId === researcherId) ? { ...r, dscSigningScope: newScope } : r));
        }
        else {
            toast.error(res?.message || 'Failed to update DSC permission');
        }
    }
    catch (err) {
        toast.error(err.message || 'Error updating DSC permission');
    }
    finally {
        setUpdatingDscScopeId(null);
    }
};
const startEditStaff = (st) => {
    setEditingStaff(st);
    setStaffName(st.name || '');
    setStaffUsername(st.username || st.user?.username || '');
    setStaffEmail(st.email || '');
    setStaffMobile(st.mobile || '');
    const rName = st.user?.role?.name;
    setStaffRole(['SALES', 'MARKETING'].includes(rName) ? 'PERSON_ASSOCIATED' : (rName || 'RESEARCHER'));
    if (st.personAssociated) {
        setAssociatedType(st.personAssociated.roleType || 'SALES');
        setCustomAssociatedRole(st.personAssociated.customRole || '');
    }
    else {
        setAssociatedType('SALES');
        setCustomAssociatedRole('');
    }
    setStaffNism(st.nismNumber || '');
    setStaffNismValidity(st.nismValidity ? new Date(st.nismValidity).toISOString().split('T')[0] : '');
    setStaffNismFile(null);
    setStaffDscScope(st.dscSigningScope || st.user?.dscSigningScope || 'DISABLED');
    setCreatedStaffCreds(null);
    setIsStaffModalOpen(true);
};
const downloadFile = async (fileUrl, fileName) => {
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
    }
    catch (error) {
        window.open(fileUrl, '_blank');
    }
};
const handleCreateOrUpdateStaff = async (e) => {
    e.preventDefault();
    if (isSubmittingStaff)
        return;
    setIsSubmittingStaff(true);
    setCreatedStaffCreds(null);
    try {
        // Frontend Validations
        if (!staffName || staffName.trim().length < 2 || !/^[a-zA-Z\s]+$/.test(staffName)) {
            toast('Staff name must contain only letters and spaces (min 2 chars).');
            return;
        }
        const cleanUsername = (staffUsername || '').trim().toLowerCase();
        if (!editingStaff) {
            if (!cleanUsername || cleanUsername.length < 2) {
                toast('Staff username is required and must be at least 2 characters.');
                return;
            }
            if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
                toast('Username can only contain letters, numbers, underscores, dots, and hyphens.');
                return;
            }
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
        const selectedRoleObj = roles.find((r) => r.name === staffRole);
        const roleRequiresNism = selectedRoleObj?.requiresNism === true;
        if (roleRequiresNism) {
            if (!staffNism || staffNism.trim().length < 5) {
                toast.error(`NISM Registration Number is mandatory for role '${staffRole.replace(/_/g, ' ')}' (min 5 characters).`);
                setIsSubmittingStaff(false);
                return;
            }
            if (isNismDuplicate) {
                toast.error('Duplicate NISM Certificate Number. Please enter a unique number.');
                setIsSubmittingStaff(false);
                return;
            }
            if (!staffNismValidity || new Date(staffNismValidity) <= new Date()) {
                toast.error('Valid future NISM expiry date is mandatory for this role.');
                setIsSubmittingStaff(false);
                return;
            }
            if (!editingStaff && !staffNismFile) {
                toast.error('Please upload the mandatory NISM Certificate document.');
                setIsSubmittingStaff(false);
                return;
            }
            if (editingStaff && !editingStaff.nismUpload && !staffNismFile) {
                toast.error('Please upload the mandatory NISM Certificate document.');
                setIsSubmittingStaff(false);
                return;
            }
        }
        else {
            if (staffNism && staffNism.trim().length > 0) {
                if (staffNism.trim().length < 5) {
                    toast.error('NISM Registration Number must be at least 5 characters.');
                    setIsSubmittingStaff(false);
                    return;
                }
                if (isNismDuplicate) {
                    toast.error('Duplicate NISM Certificate Number. Please enter a unique number.');
                    setIsSubmittingStaff(false);
                    return;
                }
                if (!staffNismValidity || new Date(staffNismValidity) <= new Date()) {
                    toast.error('NISM validity expiry date must be in the future.');
                    setIsSubmittingStaff(false);
                    return;
                }
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
        formData.append('username', cleanUsername);
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
        if (staffRole === 'RESEARCHER') {
            formData.append('dscSigningScope', staffDscScope);
        }
        let res;
        if (editingStaff) {
            res = await api.updateStaff(editingStaff.id, formData);
        }
        else {
            res = await api.createStaff(formData);
        }
        if (res.success) {
            if (!editingStaff) {
                setCreatedStaffCreds(res.data);
                setIsStaffModalOpen(false);
                resetStaffForm();
                setShowStaffCredsPopup(true);
            }
            else {
                toast.success('Staff member updated successfully!');
                setIsStaffModalOpen(false);
                resetStaffForm();
            }
            loadData();
            fetchResearcherDscPermissions();
        }
        else {
            toast.error(res.message || (res.errors && res.errors.join(', ')) || 'Staff operation failed.');
        }
    }
    catch (err) {
        toast.error(err.message || 'Staff operation failed.');
    }
    finally {
        setIsSubmittingStaff(false);
    }
};
const handleToggleStaffStatus = (id) => {
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
                    fetchResearcherDscPermissions();
                    toast(res.message);
                }
            }
            catch (err) {
                toast.error(err.message || 'Failed to update status.');
            }
        }
    });
};
const handleCreateComplaint = async (e) => {
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
    }
    catch (err) {
        toast.error(err.message || 'Failed to create complaint');
    }
    finally {
        setIsSubmittingComplaint(false);
    }
};
const handleDeleteStaff = (id) => {
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
                    fetchResearcherDscPermissions();
                    toast.success('Staff member soft-deleted successfully.');
                }
            }
            catch (err) {
                toast.error(err.message || 'Failed to delete staff.');
            }
        }
    });
};
const handleRestoreStaff = (id) => {
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
                    fetchResearcherDscPermissions();
                    toast.success('Staff member restored successfully.');
                }
            }
            catch (err) {
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
                    const msg = (res.alertsGenerated && res.alertsGenerated > 0)
                        ? `Sweep done. ${res.alertsGenerated} new alert(s) generated (${res.totalActiveAlerts || res.alertsGenerated} active).`
                        : `Sweep done. ${res.totalActiveAlerts || 0} active compliance alert(s) found.`;
                    toast(msg);
                }
            }
            catch (err) {
                toast.error(err.message || 'Sweep failed.');
            }
            finally {
                setSweepLoading(false);
            }
        }
    });
};
const handleDownloadPeriodicReport = async (e) => {
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
        }
        else {
            startDateStr = `${reportYear}-10-01T00:00:00.000Z`;
            endDateStr = `${reportYear + 1}-03-31T23:59:59.999Z`;
            periodName = `Oct-Mar_${reportYear}-${reportYear + 1}`;
        }
        const res = await api.getPeriodicReportData(startDateStr, endDateStr);
        if (res.success) {
            generatePeriodicReport(res.data, periodName, endDateStr);
            setShowReportModal(false);
        }
        else {
            toast.error(res.message || 'Failed to fetch report data.');
        }
    }
    catch (err) {
        toast.error(err.message || 'Error generating report.');
    }
    finally {
        setDownloadingReport(false);
    }
};
const handleAuditUpdate = async (e) => {
    e.preventDefault();
    if (!auditModalReq || !auditStatus)
        return;
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
                    setAuditModalReq(null);
                    setAuditStatus('');
                    setAuditRemarks('');
                    setAuditPenaltyAmt('');
                    setAuditProof(null);
                    loadData();
                    toast.success('Audit status updated successfully.');
                }
                else {
                    toast.error(res.message || 'Failed to update.');
                }
            }
            catch (err) {
                toast(err.message);
            }
            finally {
                setResolveLoading(false);
            }
        }
    });
};
const handlePenaltyResolve = async (e) => {
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
                if (penaltyProof)
                    fd.append('proof', penaltyProof);
                fd.append('remarks', penaltyRemarks);
                const res = await api.resolvePenalty(penaltyResolveId, fd);
                if (res.success) {
                    setPenaltyResolveId(null);
                    setPenaltyResolutionType('');
                    setPenaltyPayRef('');
                    setPenaltyProof(null);
                    setPenaltyRemarks('');
                    loadData();
                    toast.success('Penalty resolved successfully.');
                }
                else {
                    toast.error(res.message || 'Failed to resolve.');
                }
            }
            catch (err) {
                toast(err.message);
            }
            finally {
                setResolveLoading(false);
            }
        }
    });
};
const handleComplaintResolve = async (e) => {
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
        }
        else {
            toast.error(res.message || res.error || 'Failed to resolve complaint.');
        }
    }
    catch (err) {
        toast.error(err.message || 'Failed to resolve complaint.');
    }
    finally {
        setComplaintResolveLoading(false);
    }
};
// Resolve Alert Close
const handleCloseAlert = async (e) => {
    e.preventDefault();
    if (!closingAlertId)
        return;
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to close alert.');
            }
        }
    });
};
const handleResolveAlert = (alertId, alertType) => {
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
                }
                else {
                    toast.error(res.message || 'Failed to resolve alert.');
                }
            }
            catch (err) {
                toast.error(err.message || 'Failed to resolve alert.');
            }
        }
    });
};
// Smart Verification Modal Submit
const handleSubmitVerificationModal = async () => {
    if (!selectedVerifyPayment)
        return;
    if (verifyReceivedAmount <= 0) {
        toast.error('Please enter a valid received amount (> 0).');
        return;
    }
    const planAmount = Number(selectedVerifyPayment.plan?.amount || selectedVerifyPayment.plan?.price || selectedVerifyPayment.amount || 0);
    if (planAmount > 0 && verifyReceivedAmount > planAmount) {
        toast.error(`Received amount cannot exceed the plan standard price of ₹${planAmount.toLocaleString('en-IN')}.`);
        return;
    }
    setIsSubmittingVerify(true);
    try {
        const payload = {
            paymentId: selectedVerifyPayment.id || selectedVerifyPayment._id,
            status: 'SUCCESS',
            receivedAmount: Number(verifyReceivedAmount),
            approvalMode: verifyApprovalMode,
            customValidityDays: Number(verifyCustomDays),
            discountApplied: verifyApprovalMode === 'DISCOUNT' ? Number(verifyCustomDiscount) : 0,
            transactionRef: verifyUtr,
            remarks: verifyRemarks.trim() || undefined
        };
        const res = await api.verifyManualPayment(payload);
        if (res.success) {
            toast.success('Payment verified and subscription activated successfully!');
            setSelectedVerifyPayment(null);
            loadData();
        }
        else {
            toast.error(res.message || 'Failed to verify payment.');
        }
    }
    catch (err) {
        toast.error(err.message || 'An error occurred during verification.');
    }
    finally {
        setIsSubmittingVerify(false);
    }
};
// Verify Manual Payment
const handleVerifyPayment = (paymentId, status) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to verify payment.');
            }
        }
    });
};
const handleCloseAdminTicket = (ticketId) => {
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
                    if (res2.success)
                        setSelectedAdminTicket(res2.data);
                    const listRes = await api.listAdminTickets();
                    if (listRes.success)
                        setAdminTickets(listRes.data);
                }
            }
            catch (err) {
                toast.error(err.message || 'Failed to close ticket');
            }
        }
    });
};
// Create Research
const handleCreateResearch = async (e) => {
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
    }
    catch (err) {
        toast.error(err.message || 'Failed to create research.');
    }
};
// Publish Research
const handlePublishResearch = async () => {
    if (!checklistReportId)
        return;
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
    }
    catch (err) {
        setPublishError(err.message || 'Failed to publish research.');
    }
};
const startEditClient = (cl) => {
    if (!requireSetupPrerequisites('Edit Client Profile'))
        return;
    if (isStaff && !hasPermission('EDIT_CLIENTS')) {
        toast.error('You do not have permission to edit clients.');
        return;
    }
    setEditingClient(cl);
    setEditClientName(cl.name || '');
    setEditClientEmail(cl.email || '');
    setEditClientMobile(cl.mobile || '');
    setEditClientPan(cl.pan || '');
    setEditClientAadhaar(cl.aadhaar || '');
    setEditClientCategory(cl.category || 'INDIVIDUAL');
    setEditClientOccupation(cl.occupation || '');
    setEditClientAddress(cl.profile?.addressLine1 || cl.address || '');
    setEditClientCity(cl.profile?.city || cl.city || '');
    // Resolve state name properly (maps numeric GST codes like 023 -> Madhya Pradesh)
    const rawSt = String(cl.profile?.state || cl.state || '').trim();
    const cleanSt = rawSt.replace(/^0+/, '');
    const matchedState = states.find((s) => s.name?.toLowerCase() === rawSt.toLowerCase() ||
        String(s.gstCode || '').replace(/^0+/, '') === cleanSt);
    setEditClientState(matchedState ? matchedState.name : rawSt);
    setEditClientZip(cl.profile?.zipCode || cl.zipCode || '');
    setEditClientIsTelegramTradeEnabled(cl.isTelegramTradeEnabled !== false);
    setEditClientIsSmsTradeEnabled(cl.isSmsTradeEnabled !== false);
    setEditClientTelegramChatId(cl.telegramChatId || '');
    setEditClientTelegramUsername(cl.telegramUsername || '');
    setIsEditClientModalOpen(true);
};
const handleDeleteClient = (clientId) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to delete client.');
            }
        }
    });
};
const handleApproveClient = async (clientId) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to approve client.');
            }
        }
    });
};
const handleRestoreClient = (clientId) => {
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
            }
            catch (err) {
                toast.error(err.message || 'Failed to restore client.');
            }
        }
    });
};
const handleToggleClientStatus = (clientId, currentStatus, clientName) => {
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
            }
            catch (e) {
                toast.error(e.message || 'Failed to update client status.');
            }
        }
    });
};
const handleUpdateClientSubmit = async (e) => {
    e.preventDefault();
    if (isStaff && !hasPermission('EDIT_CLIENTS')) {
        toast.error('You do not have permission to edit clients.');
        return;
    }
    const isKycLocked = Boolean(editingClient?.kycStatus === 'VERIFIED' ||
        editingClient?.agreementSigned === true ||
        editingClient?.kraVerified === true ||
        editingClient?.digilockerData ||
        editingClient?.profile?.isDigiLockerLocked ||
        (editingClient?.agreements && editingClient.agreements.some((a) => a.status === 'SIGNED')));
    if (!editClientName.trim() || editClientName.trim().length < 2) {
        toast('Full name must be at least 2 characters.');
        return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(editClientEmail)) {
        setWizardErrors({ coEmail: 'Please enter a valid email address.' });
        return;
    }
    if (!/^\d{10}$/.test(editClientMobile)) {
        toast('Mobile number must be exactly 10 digits.');
        return;
    }
    const panRx = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!isKycLocked && editClientPan && editClientPan !== 'N/A' && !panRx.test(editClientPan)) {
        toast('PAN must be in format: ABCDE1234F (10 characters).');
        return;
    }
    // Aadhaar Validation: Never block if client is KYC locked or if Aadhaar is masked (contains 'X' or dashes)
    const cleanAadhaar = editClientAadhaar.replace(/[\s-]/g, '');
    const isMaskedAadhaar = /x/i.test(cleanAadhaar);
    if (!isKycLocked && !isMaskedAadhaar && cleanAadhaar && cleanAadhaar !== 'N/A' && cleanAadhaar.length !== 12) {
        toast('Aadhaar number must be exactly 12 digits.');
        return;
    }
    setEditClientModalLoading(true);
    try {
        const payload = {
            name: isKycLocked ? (editingClient?.name || editClientName.trim()) : editClientName.trim(),
            email: editClientEmail.trim(),
            mobile: editClientMobile.trim(),
            pan: isKycLocked ? (editingClient?.pan || editClientPan.toUpperCase()) : editClientPan.toUpperCase(),
            aadhaar: isKycLocked ? (editingClient?.aadhaar || editClientAadhaar) : editClientAadhaar,
            category: editClientCategory,
            occupation: editClientOccupation || undefined,
            addressLine1: isKycLocked ? (editingClient?.profile?.addressLine1 || editingClient?.address || editClientAddress) : (editClientAddress || undefined),
            city: isKycLocked ? (editingClient?.profile?.city || editingClient?.city || editClientCity) : (editClientCity || undefined),
            state: isKycLocked ? (editingClient?.profile?.state || editingClient?.state || editClientState) : (editClientState || undefined),
            zipCode: isKycLocked ? (editingClient?.profile?.zipCode || editingClient?.zipCode || editClientZip) : (editClientZip || undefined),
            isTelegramTradeEnabled: editClientIsTelegramTradeEnabled,
            isSmsTradeEnabled: editClientIsSmsTradeEnabled,
            telegramChatId: editClientTelegramChatId.trim() || null,
            telegramUsername: editClientTelegramUsername.trim().replace(/^@/, '') || null
        };
        const r = await api.updateAdminClient(editingClient.id, payload);
        if (r.success) {
            setIsEditClientModalOpen(false);
            loadData();
            toast.success('Client details updated successfully!');
        }
    }
    catch (e) {
        toast.error(e.message || 'Failed to update client.');
    }
    finally {
        setEditClientModalLoading(false);
    }
};
const handleSaveClientTradeChannels = async () => {
    if (!selectedClient)
        return;
    setSavingClientChannels(true);
    try {
        const clientId = selectedClient._id || selectedClient.id;
        const payload = {
            isTelegramTradeEnabled: viewClientIsTelegramTradeEnabled,
            isSmsTradeEnabled: viewClientIsSmsTradeEnabled,
            telegramChatId: viewClientTelegramChatId.trim() || null,
            telegramUsername: viewClientTelegramUsername.trim().replace(/^@/, '') || null
        };
        const res = await api.updateAdminClient(clientId, payload);
        if (res && (res.success || res.client)) {
            toast.success('Trade Delivery channels updated successfully!');
            setSelectedClient((prev) => ({
                ...prev,
                ...payload
            }));
            setClients((prev) => prev.map(c => ((c._id || c.id) === clientId ? { ...c, ...payload } : c)));
        }
        else {
            toast.error(res?.message || 'Failed to update delivery channels');
        }
    }
    catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to update channels');
    }
    finally {
        setSavingClientChannels(false);
    }
};
// Profile Wizard Check: complete if score >= 80 or company details (address) already configured
const isProfileComplete = completeness >= 80 || Boolean(tenantDetails?.address || user?.tenant?.address || (typeof window !== 'undefined' && localStorage.getItem('tenant_completeness') && Number(localStorage.getItem('tenant_completeness')) >= 80));
const renderPermissionCheckbox = (code, title, desc, dependencyCode) => {
    const isChecked = selectedRole?.permissions?.includes(code) || false;
    const isDisabled = selectedRole ? ['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) : false;
    const isParentChecked = dependencyCode ? (selectedRole?.permissions?.includes(dependencyCode) || false) : true;
    // If dependency is not checked, disable the sub-permission checkbox (unless editing is locked completely)
    const effectivelyDisabled = isDisabled || (!isParentChecked && !isDisabled);
    return (<div onClick={() => {
            if (!effectivelyDisabled) {
                handleTogglePermission(code);
            }
        }} className={`p-3.5 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${isChecked
            ? 'bg-primary-500/5 border-primary-500/20'
            : 'bg-slate-100 dark:bg-slate-950/20 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10'} ${effectivelyDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <input type="checkbox" checked={isChecked} disabled={effectivelyDisabled} onChange={() => { }} // handled by click handler
     className="mt-1 h-3.5 w-3.5 rounded border-slate-400 dark:border-white/10 text-primary-600 focus:ring-primary-500 bg-white dark:bg-slate-900 cursor-pointer"/>
        <div className="flex-grow">
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{title}</span>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">{desc}</p>
          <span className={`inline-block text-[9px] font-bold mt-2 px-1.5 py-0.5 rounded font-mono ${isChecked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
            {isChecked ? 'ALLOWED' : 'BLOCKED'}
          </span>
        </div>
      </div>);
};
const upcomingAlerts = useMemo(() => {
    const list = [];
    checklist.forEach((item) => {
        const auditStatus = item.audit?.status || 'PENDING';
        if (auditStatus !== 'PENDING')
            return;
        const dueDateVal = item.currentPeriod?.dueDate || item.audit?.dueDate;
        const dueDateMs = dueDateVal ? new Date(dueDateVal).getTime() : null;
        if (!dueDateMs)
            return;
        const daysLeft = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) {
            list.push({
                id: item.id || item._id,
                title: `Checklist Task #${item.serialNo}`,
                description: item.requirement,
                deadlineAt: dueDateVal,
                daysLeft,
                type: 'CHECKLIST'
            });
        }
    });
    alerts.forEach((alert) => {
        if (alert.status !== 'OPEN')
            return;
        const deadlineVal = alert.deadlineAt || alert.createdAt;
        const dMs = deadlineVal ? new Date(deadlineVal).getTime() : null;
        if (dMs) {
            const daysLeft = Math.ceil((dMs - Date.now()) / (1000 * 3600 * 24));
            if (daysLeft >= 0 && daysLeft <= 7) {
                list.push({
                    id: alert.id || alert._id,
                    title: alert.title || `Compliance Alert (${alert.severity || 'HIGH'})`,
                    description: alert.description || alert.message || 'Action required',
                    deadlineAt: deadlineVal,
                    daysLeft,
                    type: 'ALERT'
                });
            }
        }
    });
    return list.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
}, [checklist, alerts]);
const overdueAlerts = useMemo(() => {
    const list = [];
    checklist.forEach((item) => {
        if (item.audit?.status === 'OVERDUE') {
            list.push(item);
            return;
        }
        const auditStatus = item.audit?.status || 'PENDING';
        if (auditStatus !== 'PENDING')
            return;
        const dueDateVal = item.currentPeriod?.dueDate || item.audit?.dueDate;
        const dueDateMs = dueDateVal ? new Date(dueDateVal).getTime() : null;
        if (!dueDateMs)
            return;
        const daysLeft = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
        if (daysLeft < 0) {
            list.push(item);
        }
    });
    alerts.forEach((alert) => {
        if (alert.status === 'OPEN' && alert.deadlineAt) {
            const dMs = new Date(alert.deadlineAt).getTime();
            if (dMs < Date.now()) {
                list.push(alert);
            }
        }
    });
    return list;
}, [checklist, alerts]);
const handleBulkExport = async (type, isZip) => {
    try {
        setExportLoading(type);
        const API_URL = api.getBaseUrl() + '/api/v1';
        let url = `${API_URL}/admin/exports/${type}`;
        if (exportRange === 'date' && exportStartDate && exportEndDate) {
            url += `?range=date&startDate=${exportStartDate}&endDate=${exportEndDate}`;
        }
        const token = localStorage.getItem('accessToken');
        const headers = { 'Authorization': 'Bearer ' + token };
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
    }
    catch (error) {
        toast.error(`Export failed: ${error.message}`);
    }
    finally {
        setExportLoading(null);
    }
};
const staffColumns = useMemo(() => [
    {
        name: 'S.No',
        width: '70px',
        selector: (row, index) => index !== undefined ? index + 1 : 0,
        cell: (row, index) => (<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          {index !== undefined ? index + 1 : ''}
        </span>),
    },
    {
        name: 'Registered On',
        width: '130px',
        selector: (row) => row.user?.createdAt,
        cell: (row) => row.user?.createdAt ? (<span className="block">
          {new Date(row.user.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>) : (<span className="text-slate-600 block">N/A</span>),
    },
    {
        name: 'Staff Member',
        minWidth: '120px',
        selector: (row) => row.name,
        cell: (row) => {
            const isDeleted = row.user?.deletedAt !== null;
            const staffUser = row.username || row.user?.username;
            return (<div>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {row.name}
              {isDeleted && (<span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  DELETED
                </span>)}
            </span>
            {staffUser && (<span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold block">@{staffUser}</span>)}
            <span className="text-[10px] text-slate-500 dark:text-slate-500 block">{row.email}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 block">{row.mobile}</span>
          </div>);
        }
    },
    {
        name: 'SEBI System Role',
        width: '160px',
        selector: (row) => row.user?.role?.name,
        cell: (row) => (<div>
          <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[9px] border border-primary-500/20 font-bold uppercase tracking-wider font-mono">
            {row.user?.role?.name || 'N/A'}
          </span>
          {row.personAssociated && (<span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1 font-mono">
              ({row.personAssociated.roleType === 'OTHER' ? row.personAssociated.customRole : row.personAssociated.roleType})
            </span>)}
        </div>)
    },
    {
        name: 'NISM Validity',
        width: '150px',
        selector: (row) => row.nismValidity,
        cell: (row) => {
            const roleName = row.user?.role?.name || row.roleName;
            const roleObj = roles.find((r) => r.name === roleName);
            const requiresNism = roleObj?.requiresNism || row.user?.role?.requiresNism;
            const isMissing = requiresNism && (!row.nismNumber || !row.nismUpload);
            return (<div>
            {isMissing ? (<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                ⚠️ NISM Required
              </span>) : row.nismValidity ? (<span className="block text-xs">
                {new Date(row.nismValidity).toDateString()}
              </span>) : (<span className="text-slate-500 text-xs block">N/A</span>)}
            {row.nismNumber && (<span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono block">
                No: {row.nismNumber}
              </span>)}
          </div>);
        }
    },
    {
        name: 'Status',
        width: '100px',
        selector: (row) => row.status,
        cell: (row) => (<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
          {row.status}
        </span>)
    },
    {
        name: 'Actions',
        width: '260px',
        right: true,
        cell: (row) => {
            const isDeleted = row.user?.deletedAt !== null;
            return (<div className="flex items-center justify-end space-x-2">
            <button onClick={() => setSelectedStaff(row)} title="View Details" className="p-1.5 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition inline-flex items-center flex-shrink-0">
              <Eye className="h-3.5 w-3.5"/>
            </button>
            {!isDeleted && (<>
                <button onClick={() => startEditStaff(row)} title="Edit Profile" className="p-1.5 rounded-lg border border-primary-500/10 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 transition inline-flex items-center flex-shrink-0">
                  <Edit2 className="h-3.5 w-3.5"/>
                </button>
                <button onClick={() => handleToggleStaffStatus(row.id)} title={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition whitespace-nowrap flex-shrink-0 ${row.status === 'ACTIVE' ? 'border border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' : 'border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'}`}>
                  {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDeleteStaff(row.id)} title="Delete Staff" className="p-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 transition inline-flex items-center flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5"/>
                </button>
              </>)}
            {isDeleted && (<button onClick={() => handleRestoreStaff(row.id)} title="Restore Staff" className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center">
                <RotateCcw className="h-3.5 w-3.5"/>
              </button>)}
          </div>);
        }
    }
], [setSelectedStaff, startEditStaff, handleToggleStaffStatus, handleDeleteStaff, handleRestoreStaff, roles]);
const paymentColumns = useMemo(() => [
    {
        name: 'Payment Date',
        width: '130px',
        selector: (row) => row.paymentDate || row.createdAt,
        cell: (row) => (<div className="text-slate-700 dark:text-slate-300 font-mono text-xs">
          {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : new Date(row.createdAt).toLocaleDateString()}
        </div>),
    },
    {
        name: 'Client Details',
        minWidth: '220px',
        selector: (row) => row.client?.user?.email,
        cell: (row) => (<div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1"><span className="text-slate-500">EMAIL:</span> {row.client?.user?.email || 'N/A'}</div>
          <div className="flex items-center gap-1"><span className="text-slate-500">MOB:</span> {row.client?.user?.mobile || 'N/A'}</div>
          <div className="flex items-center gap-1"><span className="text-slate-500">PAN:</span> {row.client?.pan || 'N/A'}</div>
        </div>),
    },
    {
        name: 'Plan',
        width: '130px',
        selector: (row) => row.plan?.name,
        cell: (row) => (<div className="flex flex-col gap-1 items-start">
          <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">{row.plan?.name || 'Custom'}</span>
          {(row.paymentMode === 'CUSTOM_PRO_RATA' || row.remarks?.includes('[PRO-RATA]')) && (<span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>)}
        </div>),
    },
    {
        name: 'Coupon',
        width: '130px',
        selector: (row) => row.coupon?.code || row.couponId?.code || row.couponCode,
        cell: (row) => {
            const couponCode = row.coupon?.code || row.couponId?.code || row.couponCode;
            const discount = row.discountApplied || row.discount || row.coupon?.discountValue || row.couponId?.discountValue || 0;
            if (!couponCode && (!discount || discount === 0)) {
                return <span className="text-slate-400 text-xs font-mono">-</span>;
            }
            return (<div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
              🎟️ {couponCode || 'APPLIED'}
            </span>
            {discount > 0 && (<span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Save ₹{discount}
              </span>)}
          </div>);
        },
    },
    {
        name: 'Amount',
        width: '130px',
        selector: (row) => row.amount,
        cell: (row) => {
            const discount = row.discountApplied || row.discount || 0;
            return (<div className="space-y-0.5">
            <span className="font-bold text-sm text-slate-900 dark:text-white">₹{row.amount}</span>
            {discount > 0 && (<span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                (₹{discount} off applied)
              </span>)}
          </div>);
        },
    },
    {
        name: 'Payment Info',
        width: '140px',
        selector: (row) => row.transactionRef,
        cell: (row) => (<div>
          <span className="block text-[10px] text-slate-600 dark:text-slate-400">{row.paymentMode}</span>
          <span className="font-mono text-slate-500 text-[10px]">{row.transactionRef}</span>
        </div>),
    },
    {
        name: 'Receipt & Invoice',
        width: '180px',
        cell: (row) => (<div className="text-slate-600 dark:text-slate-400 space-y-1.5 py-1">
          {row.status === 'SUCCESS' ? (<div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => {
                    import('@/services/api').then(m => m.default.downloadInvoicePdf(row.id || row._id, `Invoice_${row.transactionRef}.pdf`)).catch((err) => toast.error(err?.message || 'Failed to download invoice'));
                }} className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold transition inline-flex items-center gap-1 border border-slate-300 dark:border-white/10 shadow-sm" title="Download Official Tax Invoice PDF">
                  <FileText className="w-3 h-3"/>
                  Invoice PDF
                </button>
                <button onClick={async () => {
                    if (row.invoiceStatus === 'PENDING_AGREEMENT') {
                        toast.error('Client Service Agreement is pending. Invoices cannot be sent until agreement is completed.');
                        return;
                    }
                    const pId = row.id || row._id;
                    const clientEmail = row.client?.email || row.clientEmail || 'Client';
                    setSendingInvoiceId(pId);
                    const toastId = toast.loading(`Generating Tax Invoice & emailing to ${clientEmail}...`);
                    try {
                        const res = await api.sendPaymentInvoiceEmail(pId);
                        if (res.success) {
                            toast.success(res.message || `Tax Invoice sent to ${clientEmail} successfully!`, {
                                id: toastId,
                                duration: 5000
                            });
                            api.getAdminPayments().then(pRes => {
                                if (pRes.success)
                                    setAllPayments(pRes.data);
                            }).catch(() => { });
                        }
                        else {
                            toast.error(res.message || 'Failed to send invoice email', {
                                id: toastId,
                                duration: 6000
                            });
                        }
                    }
                    catch (err) {
                        toast.error(err.message || 'Error sending invoice email', {
                            id: toastId,
                            duration: 6000
                        });
                    }
                    finally {
                        setSendingInvoiceId(null);
                    }
                }} disabled={sendingInvoiceId === (row.id || row._id)} className={`text-[10px] px-2.5 py-1 rounded font-bold transition inline-flex items-center gap-1.5 border shadow-sm ${sendingInvoiceId === (row.id || row._id)
                    ? 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950 dark:text-blue-200 animate-pulse cursor-wait'
                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`} title="Email official Tax Invoice PDF directly to client">
                  {sendingInvoiceId === (row.id || row._id) ? (<>
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400"/>
                      <span>Sending PDF...</span>
                    </>) : (<>
                      <Mail className="w-3 h-3"/>
                      <span>{row.invoiceSentAt ? 'Resend Invoice' : 'Send to Client'}</span>
                    </>)}
                </button>
              </div>
              {row.invoiceSentAt && (<div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 shrink-0"/>
                  <span>Sent: {new Date(row.invoiceSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>)}
              {row.invoiceStatus === 'PENDING_AGREEMENT' && (<div className="pt-0.5">
                  <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">
                    ⏳ Agreement Pending
                  </span>
                </div>)}
              {(row.l1Details || row.l2Details || row.approvalStatus === 'APPROVED' || row.approvalStatus === 'DIRECT_APPROVED' || row.approvalStatus === 'REJECTED' || row.approvalStatus === 'L2_PENDING') && (<div className="pt-0.5">
                  <button type="button" onClick={() => setSelectedL1L2Diff(row)} className="text-[10px] bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold transition inline-flex items-center gap-1 border border-amber-300 dark:border-amber-700/50 shadow-sm" title="View L1 Submission vs L2 Approval Details">
                    <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400"/>
                    <span>L1/L2 Audit</span>
                  </button>
                </div>)}
            </div>) : row.status === 'PENDING' ? (<span className="text-[10px] text-amber-500 font-medium italic">Pending Verification</span>) : (<span className="text-[10px] text-rose-500 font-medium italic">Payment Rejected</span>)}
          {row.receiptUrl && (<div className="text-[10px] pt-1 flex items-center gap-1">
              <span className="text-slate-500">Receipt:</span>
              <button type="button" onClick={() => setSelectedScreenshotModal({
                    url: row.receiptUrl,
                    clientName: row.client?.name || row.client?.user?.name || row.clientName || 'Client',
                    planName: row.plan?.name || row.planName || 'Plan',
                    utr: row.transactionRef || '',
                    amount: row.amount
                })} className="underline text-primary-600 font-bold hover:text-primary-700 flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0" title="Click to view payment proof receipt">
                <Eye className="w-3 h-3 inline"/> View
              </button>
            </div>)}
        </div>),
    },
    {
        name: 'Status',
        width: '110px',
        right: true,
        selector: (row) => row.status || 'PENDING',
        cell: (row) => {
            const s = (row.status || 'PENDING').toUpperCase();
            if (s === 'SUCCESS') {
                return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase">Success</span>;
            }
            if (s === 'PENDING') {
                return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold uppercase">Pending</span>;
            }
            return <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold uppercase">{s}</span>;
        },
    }
], []);
const qrVerificationColumns = useMemo(() => [
    {
        name: 'Date',
        width: '120px',
        selector: (row) => row.createdAt,
        cell: (row) => (<div className="text-slate-700 dark:text-slate-300 font-mono text-xs">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}
          <span className="block text-[10px] text-slate-400">
            {row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>),
    },
    {
        name: 'Client Details',
        minWidth: '220px',
        selector: (row) => row.client?.user?.email,
        cell: (row) => (<div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-400">
          <div className="font-bold text-slate-800 dark:text-slate-200">
            {row.client?.name || row.client?.user?.name || `${row.client?.user?.firstName || ''} ${row.client?.user?.lastName || ''}`.trim() || 'Client'}
          </div>
          <div className="flex items-center gap-1"><span className="text-slate-400">Email:</span> {row.client?.user?.email || row.client?.email || 'N/A'}</div>
          <div className="flex items-center gap-1"><span className="text-slate-400">Mob:</span> {row.client?.user?.mobile || row.client?.mobile || 'N/A'}</div>
          {row.client?.pan && <div className="flex items-center gap-1"><span className="text-slate-400">PAN:</span> <span className="font-mono uppercase">{row.client.pan}</span></div>}
        </div>),
    },
    {
        name: 'Plan & Amount',
        width: '170px',
        selector: (row) => row.plan?.name,
        cell: (row) => {
            const couponCode = row.coupon?.code || row.couponId?.code || row.couponCode;
            const discount = row.discountApplied || row.discount || row.coupon?.discountValue || 0;
            return (<div className="space-y-0.5">
            <span className="font-bold text-primary-600 dark:text-primary-400 text-xs block">{row.plan?.name || 'Subscription Plan'}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">₹{row.amount}</span>
              {discount > 0 && (<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  (-₹{discount})
                </span>)}
            </div>
            {couponCode && (<div className="pt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-mono">
                  🎟️ {couponCode}
                </span>
              </div>)}
            {row.plan?.durationMonths && (<span className="block text-[10px] text-slate-400">{row.plan.durationMonths} Months</span>)}
          </div>);
        },
    },
    {
        name: 'UTR / Payment Ref',
        width: '170px',
        selector: (row) => row.transactionRef,
        cell: (row) => (<div className="space-y-1">
          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {row.paymentMode || 'UPI_QR'}
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 select-all">
              {row.transactionRef || 'N/A'}
            </span>
            {row.transactionRef && (<button type="button" onClick={() => {
                    navigator.clipboard.writeText(row.transactionRef);
                    toast.success('UTR copied!');
                }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5" title="Copy UTR">
                <Copy className="w-3 h-3"/>
              </button>)}
          </div>
        </div>),
    },
    {
        name: 'Payment Screenshot Proof',
        width: '180px',
        cell: (row) => {
            const proofUrl = row.screenshotUrl || row.receiptUrl;
            if (!proofUrl) {
                return <span className="text-[11px] text-slate-400 italic">No screenshot</span>;
            }
            const fullUrl = getFullUrl(proofUrl);
            const clientName = row.client?.name || row.client?.user?.name || 'Client';
            const planName = row.plan?.name || 'Plan';
            return (<div className="flex items-center gap-2 py-1">
            <div onClick={() => setSelectedScreenshotModal({ url: proofUrl, clientName, planName, utr: row.transactionRef || '', amount: row.amount })} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 cursor-pointer group shrink-0 shadow-sm hover:ring-2 hover:ring-primary-500 transition-all" title="Click to zoom screenshot">
              <img src={fullUrl} alt="Payment Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"/>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-4 h-4 text-white"/>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => setSelectedScreenshotModal({ url: proofUrl, clientName, planName, utr: row.transactionRef || '', amount: row.amount })} className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                <Eye className="w-3 h-3"/> View Zoom
              </button>
              <a href={fullUrl} target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-0.5">
                <ExternalLink className="w-2.5 h-2.5"/> Full Tab
              </a>
            </div>
          </div>);
        },
    },
    {
        name: 'Status',
        width: '140px',
        selector: (row) => row.status,
        cell: (row) => {
            const s = (row.status || 'PENDING').toUpperCase();
            if (row.approvalStatus === 'L2_PENDING') {
                return (<span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 flex items-center gap-1 animate-pulse">
              <ShieldCheck className="w-3 h-3 text-violet-500"/> L1 Verified (L2 Pending)
            </span>);
            }
            if (s === 'SUCCESS' || row.approvalStatus === 'APPROVED' || row.approvalStatus === 'DIRECT_APPROVED') {
                return (<span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3"/> Verified
            </span>);
            }
            if (s === 'FAILED' || row.approvalStatus === 'REJECTED') {
                return (<span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <X className="w-3 h-3"/> Rejected
            </span>);
            }
            return (<span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3"/> Pending Verification
          </span>);
        },
    },
    {
        name: 'Action',
        width: '190px',
        right: true,
        cell: (row) => {
            const s = (row.status || 'PENDING').toUpperCase();
            if (row.approvalStatus === 'L2_PENDING') {
                return (<div className="flex items-center gap-1.5 justify-end">
              <button type="button" onClick={() => setSelectedL2Payment(row)} className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1" title="Review and grant final L2 clearance">
                <ShieldCheck className="w-3.5 h-3.5"/>
                <span>L2 Review</span>
              </button>
              <button type="button" onClick={() => setSelectedL1L2Diff(row)} className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-white/10" title="View L1 Verification Audit">
                Audit
              </button>
            </div>);
            }
            if (s === 'PENDING') {
                return (<div className="flex items-center gap-1.5">
              <button type="button" onClick={() => {
                        const planAmount = Number(row.plan?.amount || row.plan?.price || row.amount || 0);
                        const planDays = (row.plan?.durationMonths ? row.plan.durationMonths * 30 : 30);
                        setSelectedVerifyPayment(row);
                        setVerifyReceivedAmount(row.amount || planAmount);
                        setVerifyApprovalMode('FULL');
                        setVerifyCustomDays(planDays);
                        setVerifyCustomDiscount(0);
                        setVerifyUtr(row.transactionRef || '');
                        setVerifyRemarks('');
                    }} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1" title="Verify payment and assign plan">
                <CheckCircle2 className="w-3.5 h-3.5"/>
                <span>Verify &amp; Assign</span>
              </button>
              <button type="button" onClick={() => handleVerifyPayment(row.id, 'FAILED')} className="px-2 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 rounded-lg text-xs font-bold transition" title="Reject payment proof">
                Reject
              </button>
            </div>);
            }
            return (<div className="flex items-center gap-1.5 justify-end">
            <span className="text-[11px] text-slate-400 font-medium">
              {s === 'SUCCESS' ? 'Plan Assigned' : (row.remarks || 'Closed')}
            </span>
            {(row.l1Details || row.l2Details) && (<button type="button" onClick={() => setSelectedL1L2Diff(row)} className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold border border-amber-300 dark:border-amber-700/50">
                L1/L2
              </button>)}
          </div>);
        },
    },
], []);
const activeChecklistColumns = useMemo(() => {
    return [
        {
            name: 'Sr.',
            width: '60px',
            selector: (row) => row.serialNo,
            cell: (row) => <span className="text-slate-500 dark:text-slate-500">{row.serialNo}</span>,
        },
        {
            name: 'Requirement',
            minWidth: '250px',
            selector: (row) => row.requirement,
            cell: (row) => <span className="font-medium max-w-xs">{row.requirement}</span>,
        },
        {
            name: 'Frequency / Next Check',
            width: '180px',
            selector: (row) => row.frequency,
            cell: (row) => {
                const isUpcoming = row.isUpcoming || (tenantCutoffDate && new Date() < new Date(tenantCutoffDate) && !row.audit);
                const dueDateMs = row.currentPeriod?.dueDate ? new Date(row.currentPeriod.dueDate).getTime() : null;
                const daysLeft = dueDateMs ? Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24)) : null;
                let dateColorClass = 'text-slate-600 dark:text-slate-400';
                if (isUpcoming) {
                    dateColorClass = 'text-blue-600 dark:text-blue-400 font-medium';
                }
                else if (daysLeft !== null) {
                    if (daysLeft < 0)
                        dateColorClass = 'text-red-600 dark:text-red-500 font-bold';
                    else if (daysLeft <= 7)
                        dateColorClass = 'text-rose-600 dark:text-rose-400 font-bold';
                    else if (daysLeft <= 30)
                        dateColorClass = 'text-orange-600 dark:text-orange-400 font-bold';
                    else
                        dateColorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
                }
                const dueDateText = row.currentPeriod?.dueDate
                    ? new Date(row.currentPeriod.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Ongoing';
                return (<div>
              <span className="block font-medium">{row.frequency}</span>
              <span className={`block text-[10px] mt-0.5 ${dateColorClass}`}>
                {isUpcoming ? `Cycle: ${row.currentPeriod?.label || 'Nov 2026'} · Due: ${dueDateText}` : `Due: ${dueDateText}`}
              </span>
            </div>);
            },
        },
        {
            name: 'Priority',
            width: '120px',
            selector: (row) => row.severityLevel,
            cell: (row) => {
                if (row.severityLevel === 'HIGH')
                    return <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.4)]">High</span>;
                if (row.severityLevel === 'MODERATE' || row.severityLevel === 'MEDIUM')
                    return <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Moderate</span>;
                if (row.severityLevel === 'LOW')
                    return <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide">Low</span>;
                return <span className="text-slate-500 dark:text-slate-500">—</span>;
            }
        },
        {
            name: 'Penalty',
            width: '120px',
            selector: (row) => row.penaltyAmount,
            cell: (row) => <span className="text-slate-600 dark:text-slate-400 max-w-[180px]">{row.penaltyAmount || '—'}</span>,
        },
        {
            name: 'Status',
            width: '130px',
            selector: (row) => row.audit?.status,
            cell: (row) => {
                const isUpcoming = row.isUpcoming || (tenantCutoffDate && new Date() < new Date(tenantCutoffDate) && !row.audit);
                const status = row.audit?.status || (isUpcoming ? 'UPCOMING' : 'PENDING');
                const colors = {
                    COMPLIANT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    NON_COMPLIANT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    PENDING: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                    UPCOMING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                    OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                    PENALTY_RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                    PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                };
                return <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${colors[status] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>{status.replace('_', ' ')}</span>;
            }
        },
        ...(user.role === 'COMPLIANCE_OFFICER' ? [{
                name: 'Action',
                width: '100px',
                right: true,
                cell: (row) => {
                    const status = row.audit?.status || 'PENDING';
                    const dueDateMs = row.currentPeriod?.dueDate ? new Date(row.currentPeriod.dueDate).getTime() : null;
                    const daysLeft = dueDateMs ? Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24)) : null;
                    const requiresAction = daysLeft === null || daysLeft <= 30;
                    if (!requiresAction)
                        return null;
                    return (<button onClick={() => { setAuditModalReq(row); setAuditStatus(status !== 'PENDING' ? status : ''); setAuditRemarks(row.audit?.officerRemarks || ''); }} className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] rounded-lg text-[10px] font-bold transition">Update</button>);
                }
            }] : [])
    ];
}, [user.role, setAuditModalReq, setAuditStatus, setAuditRemarks]);
const checklistHistoryColumns = useMemo(() => [
    {
        name: 'Sr.',
        width: '60px',
        selector: (row) => row.requirement?.serialNo,
    },
    {
        name: 'Requirement',
        minWidth: '200px',
        selector: (row) => row.requirement?.requirement,
        cell: (row) => <span className="font-medium max-w-xs">{row.requirement?.requirement}</span>,
    },
    {
        name: 'Period',
        width: '140px',
        selector: (row) => row.periodLabel,
        cell: (row) => <span className="font-semibold text-primary-700 dark:text-primary-300">{row.periodLabel || '—'}</span>,
    },
    {
        name: 'Change Log',
        width: '180px',
        cell: (row) => {
            const prevStatus = row.previousStatus || 'PENDING';
            const newStatus = row.newStatus;
            const colors = {
                COMPLIANT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                NON_COMPLIANT: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                PENDING: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                OVERDUE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                PENALTY_RESOLVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            };
            return (<div className="flex items-center space-x-1">
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase ${colors[prevStatus] || 'bg-slate-500/10'}`}>{prevStatus.replace('_', ' ')}</span>
            <span className="text-slate-500 dark:text-slate-500">→</span>
            <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded border uppercase ${colors[newStatus] || 'bg-slate-500/10'}`}>{newStatus.replace('_', ' ')}</span>
          </div>);
        }
    },
    {
        name: 'Remarks',
        width: '150px',
        selector: (row) => row.officerRemarks,
        cell: (row) => <span className="text-slate-600 dark:text-slate-400 max-w-xs truncate" title={row.officerRemarks}>{row.officerRemarks || '—'}</span>,
    },
    {
        name: 'Proof / Details',
        width: '130px',
        cell: (row) => (<button onClick={() => setViewingAuditDetail(row)} className="text-indigo-600 dark:text-indigo-400 hover:text-slate-900 dark:text-white font-semibold text-xs inline-flex items-center px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition">
          <Eye className="h-3 w-3 mr-1"/> View Details
        </button>),
    },
    {
        name: 'Updated By',
        width: '120px',
        selector: (row) => row.updatedByName,
        cell: (row) => <span className="text-slate-600 dark:text-slate-400">{row.updatedByName || 'System'}</span>,
    },
    {
        name: 'Date',
        width: '130px',
        right: true,
        selector: (row) => row.createdAt,
        cell: (row) => <span className="text-slate-500 dark:text-slate-500">{new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>,
    }
], []);
const alertColumns = useMemo(() => [
    {
        name: 'Alert Type',
        width: '180px',
        selector: (row) => row.alertType,
        cell: (row) => <span className="font-bold">{row.alertType === 'PENALTY_LEVIED' ? 'PENALTY RISK' : row.alertType.replace(/_/g, ' ')}</span>,
    },
    {
        name: 'Severity',
        width: '120px',
        selector: (row) => row.severity,
        cell: (row) => {
            let severityBadge = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
            if (row.severity === 'HIGH')
                severityBadge = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-bold";
            else if (row.severity === 'MEDIUM')
                severityBadge = "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-bold";
            else if (row.severity === 'LOW')
                severityBadge = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 font-bold";
            return <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${severityBadge}`}>{row.severity}</span>;
        },
    },
    {
        name: 'Description',
        minWidth: '250px',
        selector: (row) => row.description,
        cell: (row) => <span className="whitespace-normal text-xs min-w-[300px] max-w-[500px] block">{formatAlertDescription(row.description)}</span>,
    },
    {
        name: 'Created Date',
        width: '130px',
        selector: (row) => row.createdAt,
        cell: (row) => <span className="text-xs">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
        name: 'Status',
        width: '120px',
        center: true,
        selector: (row) => row.status,
        cell: (row) => {
            let statusBadge = row.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
            return <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-transparent ${statusBadge}`}>{row.status}</span>;
        },
    },
    {
        name: 'Action',
        width: '120px',
        right: true,
        cell: (row) => {
            if (row.status !== 'OPEN')
                return null;
            let resolveBtnColor = "bg-amber-600 hover:bg-amber-500 text-white";
            if (row.severity === 'HIGH')
                resolveBtnColor = "bg-rose-600 hover:bg-rose-500 text-white";
            else if (row.severity === 'MEDIUM')
                resolveBtnColor = "bg-orange-600 hover:bg-orange-500 text-white";
            else if (row.severity === 'LOW')
                resolveBtnColor = "bg-yellow-600 hover:bg-yellow-500 text-white";
            return (<button onClick={() => {
                    if (row.alertType === 'PENALTY_LEVIED' && row.penaltyId) {
                        setPenaltyResolveId(row.penaltyId);
                        setPenaltyPayRef('');
                        setPenaltyProof(null);
                        setPenaltyRemarks('');
                    }
                    else if (['KYC_MISSING', 'KYC_FAILED', 'AGREEMENT_MISSING', 'PAN_MISSING'].includes(row.alertType)) {
                        handleResolveAlert(row.id, row.alertType);
                    }
                    else {
                        setClosingAlertId(row.id);
                        setDepositTopup(row.alertType === 'DEPOSIT_LOW' ? '50000' : '');
                        setCloseRemarks('');
                        setAlertProof(null);
                    }
                }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${resolveBtnColor}`}>
            Resolve
          </button>);
        }
    }
], [setPenaltyResolveId, setPenaltyPayRef, setPenaltyProof, setPenaltyRemarks, handleResolveAlert, setClosingAlertId, setDepositTopup, setCloseRemarks, setAlertProof]);
const activeComplaintsColumns = useMemo(() => [
    {
        name: 'Client',
        width: '150px',
        selector: (row) => row.clientName,
        cell: (row) => <span className="font-medium">{row.clientName}</span>,
    },
    {
        name: 'Source',
        width: '130px',
        selector: (row) => row.source,
        cell: (row) => <div>{row.source} {row.scoresRefId && <span className="block text-xs text-slate-600 dark:text-slate-400">{row.scoresRefId}</span>}</div>,
    },
    {
        name: 'Subject',
        minWidth: '180px',
        selector: (row) => row.subject,
    },
    {
        name: 'Received',
        width: '110px',
        selector: (row) => row.receivedAt,
        cell: (row) => <span>{row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : '-'}</span>,
    },
    {
        name: 'Deadline',
        width: '110px',
        selector: (row) => row.deadlineAt,
        cell: (row) => <span>{row.deadlineAt ? new Date(row.deadlineAt).toLocaleDateString() : '-'}</span>,
    },
    {
        name: 'Resolved Date',
        width: '120px',
        selector: (row) => row.resolvedAt || row.updatedAt,
        cell: (row) => {
            const isResolvedOrClosed = row.status === 'CLOSED' || row.status === 'RESOLVED';
            const resDate = row.resolvedAt || (isResolvedOrClosed ? row.updatedAt : null);
            return <span className="font-medium text-slate-700 dark:text-slate-300">{resDate ? new Date(resDate).toLocaleDateString() : '-'}</span>;
        },
    },
    {
        name: 'Resolution SLA',
        width: '170px',
        cell: (row) => {
            const isResolvedOrClosed = row.status === 'CLOSED' || row.status === 'RESOLVED';
            if (isResolvedOrClosed) {
                const resDate = row.resolvedAt || row.updatedAt;
                if (!resDate || !row.deadlineAt)
                    return <span className="text-slate-400 font-mono text-xs">-</span>;
                const resolvedTime = new Date(resDate).getTime();
                const deadlineTime = new Date(row.deadlineAt).getTime();
                const diffDays = Math.ceil((resolvedTime - deadlineTime) / (1000 * 3600 * 24));
                if (diffDays <= 0) {
                    return (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
                Resolved Timely
              </span>);
                }
                else {
                    return (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0"/>
                {diffDays} {diffDays === 1 ? 'day' : 'days'} Overdue
              </span>);
                }
            }
            if (!row.deadlineAt)
                return <span className="text-slate-400 font-mono text-xs">-</span>;
            const daysLeft = Math.ceil((new Date(row.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
            const isBreached = daysLeft < 0;
            const isWarning = daysLeft >= 0 && daysLeft <= 5;
            const overdueDays = Math.abs(daysLeft);
            if (isBreached) {
                return (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
              {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
            </span>);
            }
            if (daysLeft === 0) {
                return (<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
              Due Today
            </span>);
            }
            return (<span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${isWarning ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          </span>);
        },
    },
    {
        name: 'Status',
        width: '120px',
        selector: (row) => row.status,
        cell: (row) => {
            const isResolvedOrClosed = row.status === 'CLOSED' || row.status === 'RESOLVED';
            if (isResolvedOrClosed) {
                const resDate = row.resolvedAt || row.updatedAt;
                const resolvedTime = resDate ? new Date(resDate).getTime() : 0;
                const deadlineTime = row.deadlineAt ? new Date(row.deadlineAt).getTime() : 0;
                const isOverdue = resolvedTime > deadlineTime && deadlineTime > 0;
                return (<span className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${isOverdue ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
              {row.status}
            </span>);
            }
            return (<span className="px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {row.status}
          </span>);
        },
    },
    {
        name: 'Action',
        width: '130px',
        right: true,
        cell: (row) => {
            const isResolvedOrClosed = row.status === 'CLOSED' || row.status === 'RESOLVED';
            if (!isResolvedOrClosed) {
                return (<div className="flex items-center justify-end gap-2">
              <button onClick={() => {
                        setComplaintResolveId(row.id);
                        setComplaintAtrProof(null);
                        setComplaintAtrRemarks('');
                    }} className="text-primary-600 dark:text-primary-400 hover:text-slate-900 dark:text-white font-semibold text-xs underline">Resolve</button>
              <button onClick={() => setViewingComplaint(row)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium text-xs inline-flex items-center" title="View Complaint Details">
                <Eye className="h-3 w-3 mr-0.5"/> Details
              </button>
            </div>);
            }
            return (<button onClick={() => setViewingComplaint(row)} className="text-emerald-600 dark:text-emerald-400 hover:text-slate-900 dark:text-white font-bold text-xs inline-flex items-center px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition">
            <Eye className="h-3.5 w-3.5 mr-1"/> View Details
          </button>);
        },
    }
], [setComplaintResolveId, setComplaintAtrProof, setComplaintAtrRemarks, setViewingComplaint]);
const clientColumns = useMemo(() => [
    {
        name: 'S.No',
        width: '70px',
        selector: (row, index) => index !== undefined ? index + 1 : 0,
        cell: (row, index) => (<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          {index !== undefined ? index + 1 : ''}
        </span>),
    },
    {
        name: 'Client Name',
        minWidth: '200px',
        selector: (row) => row.name,
        cell: (row) => {
            const isDeleted = row.user?.deletedAt !== null && row.user?.deletedAt !== undefined;
            const deleteSuffix = `_deleted_${row.id}`;
            const displayName = row.name?.replace(deleteSuffix, '') || row.name;
            const displayEmail = row.email?.replace(deleteSuffix, '') || row.email;
            const displayMobile = row.mobile?.replace(deleteSuffix, '') || row.mobile;
            return (<div className={`${isDeleted ? 'opacity-60' : ''}`}>
            <div className="font-bold text-slate-900 dark:text-white">{displayName}</div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{displayEmail}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-500">{displayMobile}</div>
          </div>);
        }
    },
    {
        name: 'PAN / Aadhaar',
        width: '150px',
        cell: (row) => {
            const deleteSuffix = `_deleted_${row.id}`;
            const displayPan = row.pan?.replace(deleteSuffix, '') || row.pan;
            const displayAadhaar = row.aadhaar?.replace(deleteSuffix, '') || row.aadhaar;
            return (<div>
            <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{displayPan}</div>
            <div className="font-mono text-slate-500 dark:text-slate-500 text-[10px] mt-0.5">{displayAadhaar?.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</div>
          </div>);
        }
    },
    {
        name: 'Location',
        width: '140px',
        cell: (row) => row.profile?.city || row.profile?.state ? (<div>
          <div className="text-slate-700 dark:text-slate-300">{row.profile.city || '—'}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{row.profile.state || '—'}</div>
        </div>) : (<span className="text-slate-500 dark:text-slate-500 italic text-[10px]">No Location</span>)
    },
    {
        name: 'Registered On',
        width: '130px',
        selector: (row) => row.user?.createdAt,
        cell: (row) => (<div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-wider">
          {new Date(row.user?.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>)
    },
    {
        name: 'Plan Status',
        width: '135px',
        cell: (row) => {
            const { planStatus, activePlanName, expiryDate } = getClientPlanAndSegmentStatus(row);
            const isDeleted = row.user?.deletedAt !== null && row.user?.deletedAt !== undefined;
            return (<div className="flex flex-col gap-1 items-start">
            {planStatus === 'ACTIVE' && (<span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                ACTIVE
              </span>)}
            {planStatus === 'EXPIRED' && (<span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"/>
                EXPIRED
              </span>)}
            {planStatus === 'NO_PLAN' && (<span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                NO PLAN
              </span>)}
            {activePlanName && (<span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[125px]" title={activePlanName}>
                {activePlanName}
              </span>)}
            {expiryDate && (<span className="text-[9px] text-slate-500 dark:text-slate-500 font-mono">
                Exp: {new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>)}
            {isDeleted && (<span className="text-[8px] font-bold uppercase text-rose-500">Deleted User</span>)}
          </div>);
        }
    },
    {
        name: 'Segments',
        width: '185px',
        cell: (row) => {
            const { segments } = getClientPlanAndSegmentStatus(row);
            if (!segments || segments.length === 0) {
                return <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">—</span>;
            }
            return (<div className="flex flex-wrap gap-1.5 items-center">
            {segments.map((seg) => {
                    const expStr = seg.expiry ? new Date(seg.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
                    return (<span key={seg.key} title={`${seg.label}: ${seg.isActive ? 'Active until' : 'Expired on'} ${expStr}`} className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase border transition-all ${seg.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'}`}>
                  {seg.label}
                </span>);
                })}
          </div>);
        }
    },
    {
        name: 'Trade Channels',
        width: '185px',
        cell: (row) => {
            const isTgEnabled = row.isTelegramTradeEnabled !== false;
            const hasTgChatId = Boolean(row.telegramChatId);
            const isSmsEnabled = row.isSmsTradeEnabled !== false;
            const hasMobile = Boolean(row.mobile || row.user?.mobile);
            return (<div className="flex flex-wrap gap-1 items-center">
            {/* Telegram Badge */}
            {isTgEnabled ? (hasTgChatId ? (<span title={`Telegram Active (Chat ID: ${row.telegramChatId})`} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
                  <Send className="w-2.5 h-2.5"/> TG
                </span>) : (<span title="Telegram Enabled but Chat ID not linked in profile" className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Send className="w-2.5 h-2.5"/> TG (No ID)
                </span>)) : (<span title="Telegram Trade Dispatch Disabled for this client" className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                TG Off
              </span>)}

            {/* SMS Badge */}
            {isSmsEnabled ? (hasMobile ? (<span title={`SMS Active (${row.mobile || row.user?.mobile})`} className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                  <Smartphone className="w-2.5 h-2.5"/> SMS
                </span>) : (<span title="SMS Enabled but No Mobile" className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  SMS (No No)
                </span>)) : (<span title="SMS Trade Dispatch Disabled for this client" className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-500/20">
                SMS Off
              </span>)}

            {/* Panel Badge */}
            <span title="In-App Client Panel Active" className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Panel
            </span>
          </div>);
        }
    },
    {
        name: 'Added By / Source',
        width: '150px',
        cell: (row) => {
            if (row.createdByInfo?.type === 'SELF' || !row.createdById) {
                return (<span className="text-[9px] font-bold uppercase text-sky-700 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              👤 Self Signup
            </span>);
            }
            else if (row.createdByInfo?.type === 'ADMIN') {
                return (<span className="text-[9px] font-bold uppercase text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              🛡️ {row.createdByInfo?.label || 'Added by Admin'}
            </span>);
            }
            else {
                return (<span className="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              👨‍💼 {row.createdByInfo?.label || 'Added by Staff'}
            </span>);
            }
        }
    },
    {
        name: 'Esign/KRA',
        width: '140px',
        cell: (row) => {
            const isKraVerified = Boolean((row.camsKraData || row.kraStatus) && row.kraVerified);
            return (<div className="flex flex-col gap-1.5 items-start">
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${isKraVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
              KRA: {isKraVerified ? 'VERIFIED' : 'PENDING'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${row.agreements?.some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
              eSign: {row.agreements?.some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE') ? 'DONE' : 'NO'}
            </span>
          </div>);
        }
    },
    {
        name: 'Actions',
        width: '295px',
        right: true,
        cell: (row) => {
            const isDeleted = row.user?.deletedAt !== null && row.user?.deletedAt !== undefined;
            return (<div className="flex justify-end space-x-1.5 whitespace-nowrap">
            <button onClick={() => { setSelectedClient(row); setIsViewClientModalOpen(true); setClientDetailsTab('profile'); }} title="View Details" className="p-1.5 rounded-lg border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white transition inline-flex items-center">
              <Eye className="h-3.5 w-3.5"/>
            </button>
            <button onClick={() => { setSelectedTimelineClient({ id: row.id, name: row.name }); setIsTimelineModalOpen(true); }} title="Client Activity Timeline & Audit" className="p-1.5 rounded-lg border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:text-sky-300 transition inline-flex items-center">
              <Clock className="h-3.5 w-3.5"/>
            </button>
            {row.user?.status === 'PENDING_APPROVAL' && (<button onClick={() => handleApproveClient(row.id)} title="Approve Client" className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center">
                <Check className="h-3.5 w-3.5"/>
              </button>)}
            {!isDeleted ? (<>
                {(!isStaff || hasPermission('EDIT_CLIENTS')) && (<button onClick={() => startEditClient(row)} title="Edit Profile" className="p-1.5 rounded-lg border border-primary-500/10 bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 transition inline-flex items-center">
                    <Edit2 className="h-3.5 w-3.5"/>
                  </button>)}
                {(!isStaff || hasPermission('DELETE_CLIENTS')) && (<button onClick={() => handleDeleteClient(row.id)} title="Delete Client" className="p-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-300 transition inline-flex items-center">
                    <Trash2 className="h-3.5 w-3.5"/>
                  </button>)}
                {(!isStaff || hasPermission('EDIT_CLIENTS')) && (<button onClick={() => handleToggleClientStatus(row.id, row.user?.status, row.name)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${row.user?.status === 'ACTIVE' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'}`}>
                    {row.user?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>)}
                {(!isStaff || hasPermission('EDIT_CLIENTS')) && (<button onClick={() => { setAssignPlanClient(row); setAssignPlanCategoryId(''); setAssignPlanId(''); setAssignPlanRemarks(''); setIsAssignPlanModalOpen(true); }} title="Assign Plan" className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 inline-flex items-center gap-1">
                    <CreditCard className="h-3 w-3"/>
                    <span>Assign</span>
                  </button>)}
              </>) : (<>
                {(!isStaff || hasPermission('DELETE_CLIENTS')) && (<button onClick={() => handleRestoreClient(row.id)} title="Restore Client" className="p-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 transition inline-flex items-center">
                    <RotateCcw className="h-3.5 w-3.5"/>
                  </button>)}
              </>)}
          </div>);
        }
    }
], [setSelectedClient, setIsViewClientModalOpen, setClientDetailsTab, handleApproveClient, startEditClient, handleDeleteClient, handleToggleClientStatus, setAssignPlanClient, setAssignPlanCategoryId, setAssignPlanId, setAssignPlanRemarks, setIsAssignPlanModalOpen, handleRestoreClient, isStaff, hasPermission, setSelectedTimelineClient, setIsTimelineModalOpen]);



  const contextValue = {
    isCompletenessLoading,
    setIsCompletenessLoading,
    wizardStep,
    setWizardStep,
    wizardDetails,
    setWizardDetails,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    activeTab,
    setActiveTab,
    dashboardStats,
    setDashboardStats,
    settingsTab,
    setSettingsTab,
    tenantDetails,
    setTenantDetails,
    telegramTradeEnabled,
    setTelegramTradeEnabled,
    smsTradeEnabled,
    setSmsTradeEnabled,
    telegramBotToken,
    setTelegramBotToken,
    telegramBotUsername,
    setTelegramBotUsername,
    telegramJoinRule,
    setTelegramJoinRule,
    testingBot,
    setTestingBot,
    savingTradeDispatch,
    setSavingTradeDispatch,
    botTestResult,
    setBotTestResult,
    availableOccupations,
    setAvailableOccupations,
    integrationTab,
    setIntegrationTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    activityLogs,
    setActivityLogs,
    loadingAuditLogs,
    setLoadingAuditLogs,
    auditSearchQuery,
    setAuditSearchQuery,
    auditCategoryFilter,
    setAuditCategoryFilter,
    auditRoleFilter,
    setAuditRoleFilter,
    selectedAuditLog,
    setSelectedAuditLog,
    auditCurrentPage,
    setAuditCurrentPage,
    adminPagesList,
    setAdminPagesList,
    isPagesExpanded,
    setIsPagesExpanded,
    isDeliveryReportsExpanded,
    setIsDeliveryReportsExpanded,
    adminNotifications,
    setAdminNotifications,
    adminUnreadCount,
    setAdminUnreadCount,
    isAdminNotifOpen,
    setIsAdminNotifOpen,
    showAllNotifsModal,
    setShowAllNotifsModal,
    notifModalFilter,
    setNotifModalFilter,
    notifSearchQuery,
    setNotifSearchQuery,
    showRawAuditJson,
    setShowRawAuditJson,
    roles,
    setRoles,
    selectedRole,
    setSelectedRole,
    savingPermissions,
    setSavingPermissions,
    isRoleModalOpen,
    setIsRoleModalOpen,
    newRoleName,
    setNewRoleName,
    newRoleDesc,
    setNewRoleDesc,
    newRoleRequiresNism,
    setNewRoleRequiresNism,
    newRoleTwoFactorAuth,
    setNewRoleTwoFactorAuth,
    roleModalLoading,
    setRoleModalLoading,
    isEditRoleModalOpen,
    setIsEditRoleModalOpen,
    editRoleName,
    setEditRoleName,
    editRoleDesc,
    setEditRoleDesc,
    editRoleId,
    setEditRoleId,
    editRoleRequiresNism,
    setEditRoleRequiresNism,
    editRoleTwoFactorAuth,
    setEditRoleTwoFactorAuth,
    editRoleModalLoading,
    setEditRoleModalLoading,
    permissionSearchQuery,
    setPermissionSearchQuery,
    revealedStaffPassword,
    setRevealedStaffPassword,
    isLoadingStaffPassword,
    setIsLoadingStaffPassword,
    isResendingStaffPassword,
    setIsResendingStaffPassword,
    filterActiveClientRange,
    setFilterActiveClientRange,
    activeClientDownloadStartDate,
    setActiveClientDownloadStartDate,
    activeClientDownloadEndDate,
    setActiveClientDownloadEndDate,
    exportRange,
    setExportRange,
    exportStartDate,
    setExportStartDate,
    exportEndDate,
    setExportEndDate,
    exportLoading,
    setExportLoading,
    loading,
    setLoading,
    sweepLoading,
    setSweepLoading,
    downloadingReport,
    setDownloadingReport,
    showReportModal,
    setShowReportModal,
    reportYear,
    setReportYear,
    reportStartYear,
    setReportStartYear,
    reportHalf,
    setReportHalf,
    staff,
    setStaff,
    researcherDscList,
    setResearcherDscList,
    loadingResearcherDsc,
    setLoadingResearcherDsc,
    updatingDscScopeId,
    setUpdatingDscScopeId,
    staffDscScope,
    setStaffDscScope,
    clients,
    setClients,
    deletedClients,
    setDeletedClients,
    clientSubTab,
    setClientSubTab,
    clientSearch,
    setClientSearch,
    kraFilter,
    setKraFilter,
    esignFilter,
    setEsignFilter,
    sourceFilter,
    setSourceFilter,
    statusFilter,
    setStatusFilter,
    clientStartDate,
    setClientStartDate,
    clientEndDate,
    setClientEndDate,
    adminPlans,
    setAdminPlans,
    categories,
    setCategories,
    planManagementTab,
    setPlanManagementTab,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    showDeletedPlans,
    setShowDeletedPlans,
    research,
    setResearch,
    alerts,
    setAlerts,
    pendingPayments,
    setPendingPayments,
    plans,
    setPlans,
    checklist,
    setChecklist,
    checklistHistory,
    setChecklistHistory,
    checklistSubTab,
    setChecklistSubTab,
    checklistStatusFilter,
    setChecklistStatusFilter,
    showCalendarModal,
    setShowCalendarModal,
    alertsSubTab,
    setAlertsSubTab,
    historyFilterText,
    setHistoryFilterText,
    selectedFinancialYear,
    setSelectedFinancialYear,
    penalties,
    setPenalties,
    complianceTab,
    setComplianceTab,
    alertViewMode,
    setAlertViewMode,
    complaints,
    setComplaints,
    auditModalReq,
    setAuditModalReq,
    auditStatus,
    setAuditStatus,
    auditRemarks,
    setAuditRemarks,
    auditPenaltyAmt,
    setAuditPenaltyAmt,
    auditProof,
    setAuditProof,
    penaltyResolveId,
    setPenaltyResolveId,
    penaltyResolutionType,
    setPenaltyResolutionType,
    penaltyPayRef,
    setPenaltyPayRef,
    penaltyProof,
    setPenaltyProof,
    penaltyRemarks,
    setPenaltyRemarks,
    resolveLoading,
    setResolveLoading,
    complaintResolveId,
    setComplaintResolveId,
    complaintAtrProof,
    setComplaintAtrProof,
    complaintAtrRemarks,
    setComplaintAtrRemarks,
    complaintResolveLoading,
    setComplaintResolveLoading,
    viewingComplaint,
    setViewingComplaint,
    viewingAuditDetail,
    setViewingAuditDetail,
    allPayments,
    setAllPayments,
    paymentSearch,
    setPaymentSearch,
    dashboardMetric,
    setDashboardMetric,
    dashboardTimeframe,
    setDashboardTimeframe,
    adminTickets,
    setAdminTickets,
    selectedAdminTicket,
    setSelectedAdminTicket,
    adminReplyText,
    setAdminReplyText,
    adminReplyAttachment,
    setAdminReplyAttachment,
    adminTicketStatusFilter,
    setAdminTicketStatusFilter,
    supportSubTab,
    setSupportSubTab,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    catName,
    setCatName,
    catSegments,
    setCatSegments,
    isPlanModalOpen,
    setIsPlanModalOpen,
    planCategoryId,
    setPlanCategoryId,
    editingPlan,
    setEditingPlan,
    planName,
    setPlanName,
    planDesc,
    setPlanDesc,
    planPrice,
    setPlanPrice,
    planDuration,
    setPlanDuration,
    planSegments,
    setPlanSegments,
    planNotifs,
    setPlanNotifs,
    planClientLimit,
    setPlanClientLimit,
    isClientModalOpen,
    setIsClientModalOpen,
    clientDuplicateField,
    setClientDuplicateField,
    clientDuplicateError,
    setClientDuplicateError,
    clientName,
    setClientName,
    clientEmail,
    setClientEmail,
    clientMobile,
    setClientMobile,
    clientPassword,
    setClientPassword,
    clientPan,
    setClientPan,
    clientAadhaar,
    setClientAadhaar,
    clientCategory,
    setClientCategory,
    clientOccupation,
    setClientOccupation,
    clientAddress,
    setClientAddress,
    clientCity,
    setClientCity,
    clientState,
    setClientState,
    clientZip,
    setClientZip,
    clientModalLoading,
    setClientModalLoading,
    selectedClient,
    setSelectedClient,
    isViewClientModalOpen,
    setIsViewClientModalOpen,
    isEditClientModalOpen,
    setIsEditClientModalOpen,
    editingClient,
    setEditingClient,
    isAssignPlanModalOpen,
    setIsAssignPlanModalOpen,
    assignPlanClient,
    setAssignPlanClient,
    assignPlanCategoryId,
    setAssignPlanCategoryId,
    assignPlanId,
    setAssignPlanId,
    assignPlanRemarks,
    setAssignPlanRemarks,
    assignPaymentRefId,
    setAssignPaymentRefId,
    assignPaymentDate,
    setAssignPaymentDate,
    assignServiceStartDate,
    setAssignServiceStartDate,
    selectedL2Payment,
    setSelectedL2Payment,
    l2FilterTab,
    setL2FilterTab,
    selectedL1L2Diff,
    setSelectedL1L2Diff,
    l2ApprovalEnabled,
    setL2ApprovalEnabled,
    fileDownloadPolicy,
    setFileDownloadPolicy,
    fileDownloadNotificationEmail,
    setFileDownloadNotificationEmail,
    maxEmailFileSizeMb,
    setMaxEmailFileSizeMb,
    assignPlanLoading,
    setAssignPlanLoading,
    assignPlanFeeSummary,
    setAssignPlanFeeSummary,
    isLoadingFeeSummary,
    setIsLoadingFeeSummary,
    assignCustomAmount,
    setAssignCustomAmount,
    assignCustomDays,
    setAssignCustomDays,
    assignCouponCode,
    setAssignCouponCode,
    coupons,
    setCoupons,
    confirmState,
    setConfirmState,
    editClientName,
    setEditClientName,
    editClientEmail,
    setEditClientEmail,
    editClientMobile,
    setEditClientMobile,
    editClientPan,
    setEditClientPan,
    editClientAadhaar,
    setEditClientAadhaar,
    editClientCategory,
    setEditClientCategory,
    editClientOccupation,
    setEditClientOccupation,
    editClientAddress,
    setEditClientAddress,
    editClientCity,
    setEditClientCity,
    editClientState,
    setEditClientState,
    editClientZip,
    setEditClientZip,
    editClientIsTelegramTradeEnabled,
    setEditClientIsTelegramTradeEnabled,
    editClientIsSmsTradeEnabled,
    setEditClientIsSmsTradeEnabled,
    editClientTelegramChatId,
    setEditClientTelegramChatId,
    editClientTelegramUsername,
    setEditClientTelegramUsername,
    editClientModalLoading,
    setEditClientModalLoading,
    clientDetailsTab,
    setClientDetailsTab,
    viewClientIsTelegramTradeEnabled,
    setViewClientIsTelegramTradeEnabled,
    viewClientIsSmsTradeEnabled,
    setViewClientIsSmsTradeEnabled,
    viewClientTelegramChatId,
    setViewClientTelegramChatId,
    viewClientTelegramUsername,
    setViewClientTelegramUsername,
    savingClientChannels,
    setSavingClientChannels,
    showManualDigioFetch,
    setShowManualDigioFetch,
    selectedTimelineClient,
    setSelectedTimelineClient,
    isTimelineModalOpen,
    setIsTimelineModalOpen,
    clientCommunications,
    setClientCommunications,
    wizardErrors,
    setWizardErrors,
    formErrors,
    setFormErrors,
    orgAddress,
    setOrgAddress,
    orgWebsite,
    setOrgWebsite,
    orgMobile,
    setOrgMobile,
    orgGst,
    setOrgGst,
    poName,
    setPoName,
    poEmail,
    setPoEmail,
    poMobile,
    setPoMobile,
    poNism,
    setPoNism,
    poValidity,
    setPoValidity,
    coName,
    setCoName,
    coEmail,
    setCoEmail,
    coMobile,
    setCoMobile,
    coNism,
    setCoNism,
    policyUrl,
    setPolicyUrl,
    gstEnabled,
    setGstEnabled,
    gstCalculationType,
    setGstCalculationType,
    invoiceDispatchPolicy,
    setInvoiceDispatchPolicy,
    sendingInvoiceId,
    setSendingInvoiceId,
    tenantState,
    setTenantState,
    kycFirst,
    setKycFirst,
    welcomeEmailText,
    setWelcomeEmailText,
    reportDisclaimer,
    setReportDisclaimer,
    termsPdf,
    setTermsPdf,
    internalPolicyPdf,
    setInternalPolicyPdf,
    logoFile,
    setLogoFile,
    tenantLogoUrl,
    setTenantLogoUrl,
    privacyPdf,
    setPrivacyPdf,
    termsPdfUrl,
    setTermsPdfUrl,
    privacyPdfUrl,
    setPrivacyPdfUrl,
    pdfPreviewModal,
    setPdfPreviewModal,
    copiedVariable,
    setCopiedVariable,
    isGstConfirmModalOpen,
    setIsGstConfirmModalOpen,
    pendingGstTargetState,
    setPendingGstTargetState,
    isSavingGstToggle,
    setIsSavingGstToggle,
    isKycFlowConfirmModalOpen,
    setIsKycFlowConfirmModalOpen,
    pendingKycFirstState,
    setPendingKycFirstState,
    isSavingKycFlowToggle,
    setIsSavingKycFlowToggle,
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
    testSmtpEmail,
    setTestSmtpEmail,
    isTestingSmtp,
    setIsTestingSmtp,
    ccInvoiceEnabled,
    setCcInvoiceEnabled,
    ccInvoiceEmail,
    setCcInvoiceEmail,
    ccAgreementEnabled,
    setCcAgreementEnabled,
    ccAgreementEmail,
    setCcAgreementEmail,
    bankAccountName,
    setBankAccountName,
    bankAccountNo,
    setBankAccountNo,
    bankAccountType,
    setBankAccountType,
    bankIfsc,
    setBankIfsc,
    bankName,
    setBankName,
    bankBranch,
    setBankBranch,
    socialMediaLinks,
    setSocialMediaLinks,
    digioClientId,
    setDigioClientId,
    digioClientSecret,
    setDigioClientSecret,
    digioKycTemplateName,
    setDigioKycTemplateName,
    digioEnvironment,
    setDigioEnvironment,
    testingDigio,
    setTestingDigio,
    digioTestResult,
    setDigioTestResult,
    fetchDigioIdInput,
    setFetchDigioIdInput,
    fetchDigioKycId,
    setFetchDigioKycId,
    fetchDigioEsignId,
    setFetchDigioEsignId,
    fetchDigioLoading,
    setFetchDigioLoading,
    fetchDigioResult,
    setFetchDigioResult,
    fetchDigioError,
    setFetchDigioError,
    fetchDigioSaveMode,
    setFetchDigioSaveMode,
    showDigioConfirmPopup,
    setShowDigioConfirmPopup,
    camsClientCode,
    setCamsClientCode,
    camsClientId,
    setCamsClientId,
    camsClientSecret,
    setCamsClientSecret,
    camsPoscode,
    setCamsPoscode,
    testingCams,
    setTestingCams,
    camsTestResult,
    setCamsTestResult,
    camsPanInput,
    setCamsPanInput,
    camsDobInput,
    setCamsDobInput,
    fetchCamsLoading,
    setFetchCamsLoading,
    fetchCamsResult,
    setFetchCamsResult,
    fetchCamsError,
    setFetchCamsError,
    fetchCamsSaveMode,
    setFetchCamsSaveMode,
    showRawCamsJson,
    setShowRawCamsJson,
    camsEditMode,
    setCamsEditMode,
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
    verifyingGateway,
    setVerifyingGateway,
    gatewayVerifyResult,
    setGatewayVerifyResult,
    paymentGatewayEnabled,
    setPaymentGatewayEnabled,
    upiQrEnabled,
    setUpiQrEnabled,
    upiId,
    setUpiId,
    upiPayeeName,
    setUpiPayeeName,
    upiQrImageUrl,
    setUpiQrImageUrl,
    upiQrImageFile,
    setUpiQrImageFile,
    upiQrImagePreview,
    setUpiQrImagePreview,
    upiInstructions,
    setUpiInstructions,
    paymentSubTab,
    setPaymentSubTab,
    selectedScreenshotModal,
    setSelectedScreenshotModal,
    selectedVerifyPayment,
    setSelectedVerifyPayment,
    verifyReceivedAmount,
    setVerifyReceivedAmount,
    verifyApprovalMode,
    setVerifyApprovalMode,
    verifyCustomDays,
    setVerifyCustomDays,
    verifyCustomDiscount,
    setVerifyCustomDiscount,
    verifyUtr,
    setVerifyUtr,
    verifyRemarks,
    setVerifyRemarks,
    isSubmittingVerify,
    setIsSubmittingVerify,
    agreementContent,
    setAgreementContent,
    isSetupPrereqModalOpen,
    setIsSetupPrereqModalOpen,
    prereqActionTarget,
    setPrereqActionTarget,
    isSubmittingStaff,
    setIsSubmittingStaff,
    staffName,
    setStaffName,
    staffUsername,
    setStaffUsername,
    staffEmail,
    setStaffEmail,
    staffMobile,
    setStaffMobile,
    staffRole,
    setStaffRole,
    associatedType,
    setAssociatedType,
    customAssociatedRole,
    setCustomAssociatedRole,
    staffNism,
    setStaffNism,
    staffNismValidity,
    setStaffNismValidity,
    createdStaffCreds,
    setCreatedStaffCreds,
    showStaffCredsPopup,
    setShowStaffCredsPopup,
    isStaffModalOpen,
    setIsStaffModalOpen,
    editingStaff,
    setEditingStaff,
    selectedStaff,
    setSelectedStaff,
    staffNismFile,
    setStaffNismFile,
    isParsingStaffNism,
    setIsParsingStaffNism,
    staffNismParsed,
    setStaffNismParsed,
    nismParseMsg,
    setNismParseMsg,
    isComplaintModalOpen,
    setIsComplaintModalOpen,
    complaintClientName,
    setComplaintClientName,
    complaintEmail,
    setComplaintEmail,
    complaintMobile,
    setComplaintMobile,
    complaintPan,
    setComplaintPan,
    complaintSource,
    setComplaintSource,
    complaintSubject,
    setComplaintSubject,
    complaintDescription,
    setComplaintDescription,
    complaintReceivedAt,
    setComplaintReceivedAt,
    complaintSearchQuery,
    setComplaintSearchQuery,
    complaintFoundClient,
    setComplaintFoundClient,
    showClientNotFoundAlert,
    setShowClientNotFoundAlert,
    isManualFillAllowed,
    setIsManualFillAllowed,
    isSubmittingComplaint,
    setIsSubmittingComplaint,
    resTitle,
    setResTitle,
    resSummary,
    setResSummary,
    resDetails,
    setResDetails,
    resSegment,
    setResSegment,
    resType,
    setResType,
    resRecommendation,
    setResRecommendation,
    resTarget,
    setResTarget,
    checklistReportId,
    setChecklistReportId,
    chkTnc,
    setChkTnc,
    chkPolicy,
    setChkPolicy,
    chkConsent,
    setChkConsent,
    publishError,
    setPublishError,
    closingAlertId,
    setClosingAlertId,
    alertProof,
    setAlertProof,
    depositTopup,
    setDepositTopup,
    closeRemarks,
    setCloseRemarks,
    uploadingAvatar,
    setUploadingAvatar,
    showMobilePreview,
    setShowMobilePreview,
    fetchAdminNotifications,
    handleMarkAdminNotifsRead,
    hasPermission,
    handleTogglePermission,
    handleSavePermissions,
    handleCreateRole,
    handleEditRole,
    handleDeleteRole,
    getPlanAmountWithCoupon,
    triggerConfirm,
    handleAssignPlan,
    getPrerequisitesStatus,
    requireSetupPrerequisites,
    handleNavigateToPrerequisite,
    handleSearchClientForComplaint,
    getFullUrl,
    handleCopyVariable,
    openPdfPreview,
    getPdfDirectUrl,
    handleDownloadCSV,
    loadData,
    getFinancialYear,
    handleCreateCategory,
    handleToggleCategoryStatus,
    handleTogglePlanStatus,
    handleDeletePlan,
    handleRestorePlan,
    toggleMobilePreview,
    handleTestSmtp,
    handleSaveSettings,
    handleTriggerGstToggle,
    handleConfirmGstToggle,
    handleTriggerKycFlowToggle,
    handleConfirmKycFlowToggle,
    handleSaveTradeDispatchSettings,
    handleTestTelegramBot,
    handleVerifyPaymentGateway,
    handleAdminChangePassword,
    getCalculatedCutoffInfo,
    handleConfirmGoLive,
    handleLogout,
    handleRevertImpersonate,
    handleSaveWizardStep,
    resetStaffForm,
    handleStaffNismFileChange,
    fetchResearcherDscPermissions,
    handleUpdateDscScope,
    startEditStaff,
    downloadFile,
    handleCreateOrUpdateStaff,
    handleToggleStaffStatus,
    handleCreateComplaint,
    handleDeleteStaff,
    handleRestoreStaff,
    handleComplianceSweep,
    handleDownloadPeriodicReport,
    handleAuditUpdate,
    handlePenaltyResolve,
    handleComplaintResolve,
    handleCloseAlert,
    handleResolveAlert,
    handleSubmitVerificationModal,
    handleVerifyPayment,
    handleCloseAdminTicket,
    handleCreateResearch,
    handlePublishResearch,
    startEditClient,
    handleDeleteClient,
    handleApproveClient,
    handleRestoreClient,
    handleToggleClientStatus,
    handleUpdateClientSubmit,
    handleSaveClientTradeChannels,
    renderPermissionCheckbox,
    handleBulkExport,
    activeTabRef,
    rolesScrollRef,
    isMounted,
    isGoLiveModalOpen,
    setIsGoLiveModalOpen,
    isLogoutModalOpen,
    setIsLogoutModalOpen,
    NAV_CONFIG,
    ICON_MAP,
    formatAlertDescription,
    isDarkMode,
    setIsDarkMode,
    user,
    setUser,
    router,
    appName,
    appLogo,
    states,
    clientCities,
    editClientCities,
    pendingQrCount,
    complianceAlertCount,
    checklistPendingCount,
    isNismDuplicate,
    isStaff,
    tableCustomStyles,
    AGREEMENT_VARIABLES,
    salesAndClientChartData,
    availableFinancialYears,
    topLevelFilteredHistory,
    historyPagination,
    isProfileComplete,
    upcomingAlerts,
    overdueAlerts,
    staffColumns,
    paymentColumns,
    qrVerificationColumns,
    activeChecklistColumns,
    checklistHistoryColumns,
    alertColumns,
    activeComplaintsColumns,
    clientColumns,
    tenantIsLive,
    setTenantIsLive,
    tenantGoLiveAt,
    setTenantGoLiveAt,
    tenantCutoffDate,
    setTenantCutoffDate,
    completeness,
    setCompleteness,
    isProfileModalOpen,
    setIsProfileModalOpen,
    profileCurrentPassword,
    setProfileCurrentPassword,
    profileNewPassword,
    setProfileNewPassword,
    profileConfirmPassword,
    setProfileConfirmPassword,
    isChangingPassword,
    setIsChangingPassword,
    isSecretVaultOpen,
    setIsSecretVaultOpen,
    goLivePassword,
    setGoLivePassword,
    showGoLivePassword,
    setShowGoLivePassword,
    isSubmittingGoLive,
    setIsSubmittingGoLive,
    calculateSegmentExpiries,
    getDisplayStatus,
    handleLiveBadgeClick
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600 dark:text-primary-500 mb-4" />
        <span className="font-semibold text-sm">Loading Advisor Dashboard...</span>
        <button
          type="button"
          onClick={() => setLoading(false)}
          className="mt-6 px-4 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-300 dark:border-white/10 rounded-lg transition"
        >
          Taking longer than usual? Click to load immediately
        </button>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}

export default AdminContext;
