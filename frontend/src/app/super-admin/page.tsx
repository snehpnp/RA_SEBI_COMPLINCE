'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Plus, Landmark, Users, BellRing, ClipboardList, RefreshCw, CheckCircle2, XCircle, Search, Loader2, Eye, Edit, Trash2, Power, PowerOff, RotateCcw, AlertTriangle, Key, User, FileText, ChevronLeft, ChevronRight, Download, EyeOff, Menu, X, Copy, Check, Database, Sparkles, Globe, Send, Server } from 'lucide-react';
import api from '../../services/api';
import { formatPan } from '../../utils/formatters';
import SuperAdminResourcesTab from '@/components/SuperAdminResourcesTab';
import { useGlobalConfirm } from '@/components/GlobalConfirmProvider';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import dynamic from 'next/dynamic';
import { useBranding } from '@/contexts/BrandingContext';
import SuperAdminProfilePage from './profile/page';
import DashboardTab from '../../components/super-admin/tabs/DashboardTab';
import CompaniesTab from '../../components/super-admin/tabs/CompaniesTab';
import MatrixTab from '../../components/super-admin/tabs/MatrixTab';
import AuditTab from '../../components/super-admin/tabs/AuditTab';
import ComplianceTab from '../../components/super-admin/tabs/ComplianceTab';
import CompanyClientsModal from '../../components/super-admin/CompanyClientsModal';

function SuperAdminDashboardContent() {
  const router = useRouter();
  const { confirm } = useGlobalConfirm();
  const { appName, logoUrl: appLogo } = useBranding();
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'matrix' | 'audit' | 'resources' | 'profile' | 'compliance'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('superAdminActiveTab') as any) || 'dashboard';
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('superAdminActiveTab', activeTab);
    }
  }, [activeTab]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<any>({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    auditLogsCount: 0,
    activeAlerts: 0
  });

  // Companies state
  const [companies, setCompanies] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [complianceRules, setComplianceRules] = useState<any[]>([]);
  const [selectedCompanyForCompliance, setSelectedCompanyForCompliance] = useState('ALL');
  const [complianceMetrics, setComplianceMetrics] = useState<any>(null);
  const [complianceSweepLoading, setComplianceSweepLoading] = useState(false);
  const [activeComplianceSubTab, setActiveComplianceSubTab] = useState('overdue');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPageCompanies, setCurrentPageCompanies] = useState(1);
  const [currentPageMatrix, setCurrentPageMatrix] = useState(1);
  const [currentPageAudits, setCurrentPageAudits] = useState(1);
  const [currentPageLogs, setCurrentPageLogs] = useState(1);

  // Reset pagination when items per page changes
  useEffect(() => {
    setCurrentPageCompanies(1);
    setCurrentPageMatrix(1);
    setCurrentPageAudits(1);
    setCurrentPageLogs(1);
  }, [itemsPerPage]);

  // Reset pagination on search
  useEffect(() => {
    setCurrentPageCompanies(1);
    setCurrentPageLogs(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPageAudits(1);
  }, [activeComplianceSubTab]);

  // Create Company Form State
  const [duplicateFields, setDuplicateFields] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [panelName, setPanelName] = useState('');
  const [domainUrl, setDomainUrl] = useState('');
  const [mongoDbUrl, setMongoDbUrl] = useState('');
  const [dbName, setDbName] = useState('');
  const [companyType, setCompanyType] = useState('INDIVIDUAL');
  const [raType, setRaType] = useState('FULL_TIME');
  const [ownerName, setOwnerName] = useState('');
  const [sebiRegistration, setSebiRegistration] = useState('');
  const [bseEnrollment, setBseEnrollment] = useState('');
  const [email, setEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isProvisioningDb, setIsProvisioningDb] = useState(false);
  const [provisionResultMsg, setProvisionResultMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingApi, setIsSyncingApi] = useState(false);
  const [apiSyncResultMsg, setApiSyncResultMsg] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = 'Admin@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(pass);
    setShowAdminPassword(true);
  };
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [pan, setPan] = useState('');
  const [gst, setGst] = useState('');
  const [website, setWebsite] = useState('');
  const [certificateValidity, setCertificateValidity] = useState('');
  const [nismValidity, setNismValidity] = useState('');
  const [depositAmount, setDepositAmount] = useState('100000');
  const [sebiCertificate, setSebiCertificate] = useState<File | null>(null);
  const [nismCertificate, setNismCertificate] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parsedFields, setParsedFields] = useState({ companyName: false, sebiRegistration: false, certificateValidity: false, address: false });
  const [isDocumentValid, setIsDocumentValid] = useState<boolean | null>(null);
  const [pdfPreviewData, setPdfPreviewData] = useState<any>(null);
  const [showPdfConfirmModal, setShowPdfConfirmModal] = useState(false);
  const [nismPreviewData, setNismPreviewData] = useState<any>(null);
  const [showNismConfirmModal, setShowNismConfirmModal] = useState(false);
  // Custom Global Alert State (Overrides native window.alert)
  const [globalAlert, setGlobalAlert] = useState<{ message: string, isError: boolean } | null>(null);

  // File Input Refs
  const sebiFileInputRef = useRef<HTMLInputElement>(null);
  const nismFileInputRef = useRef<HTMLInputElement>(null);

  const triggerAlert = (msg: string) => {
    const msgStr = String(msg);
    const isErr = msgStr.toLowerCase().includes('failed') ||
      msgStr.toLowerCase().includes('error') ||
      msgStr.toLowerCase().includes('must be') ||
      msgStr.toLowerCase().includes('invalid') ||
      msgStr.toLowerCase().includes('could not') ||
      msgStr.toLowerCase().includes('mismatch') ||
      msgStr.toLowerCase().includes('first to') ||
      msgStr.toLowerCase().includes('please upload');
    setGlobalAlert({ message: msgStr, isError: isErr });
  };

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      triggerAlert(msg);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newCreds, setNewCreds] = useState<any>(null);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  // Modals state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<any>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editSebiCertificate, setEditSebiCertificate] = useState<File | null>(null);
  const [editNismCertificate, setEditNismCertificate] = useState<File | null>(null);
  const [documentHistory, setDocumentHistory] = useState<any[]>([]);
  const [isEditRuleModalOpen, setIsEditRuleModalOpen] = useState(false);
  const [editRuleData, setEditRuleData] = useState<any>(null);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Company Clients Modal State (Domain API Live Access)
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [selectedCompanyForClients, setSelectedCompanyForClients] = useState<any>(null);
  const [companyClientsData, setCompanyClientsData] = useState<{
    loading: boolean;
    error: string | null;
    source?: string;
    domainUrl?: string | null;
    company?: any;
    data: any[];
  }>({
    loading: false,
    error: null,
    source: undefined,
    domainUrl: null,
    company: null,
    data: []
  });

  // Profile State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [reloadToastMessage, setReloadToastMessage] = useState<string | null>(null);

  const loadData = async (showNotification = false) => {
    setIsReloading(true);
    try {
      const tel = await api.getTelemetry();
      if (tel.success) setTelemetry(tel.data);

      const comps = await api.getTenants();
      if (comps.success) setCompanies(comps.data);

      const logs = await api.getAuditLogs();
      if (logs.success) setAuditLogs(logs.data);

      const rulesRes = await api.getSuperAdminComplianceRules();
      if (rulesRes.success) setComplianceRules(rulesRes.data);

      if (activeTab === 'compliance') {
        await loadComplianceMetrics(selectedCompanyForCompliance);
      }

      if (showNotification === true) {
        setReloadToastMessage('Systems reloaded successfully.');
        setTimeout(() => setReloadToastMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to load super admin telemetry:', err);
      if (showNotification === true) {
        setReloadToastMessage('Failed to reload systems: ' + err.message);
        setTimeout(() => setReloadToastMessage(null), 3000);
      }
    } finally {
      setIsReloading(false);
    }
  };

  const loadComplianceMetrics = async (compId: string) => {
    try {
      const url = compId === 'ALL'
        ? '/compliance/dashboard-metrics'
        : `/compliance/dashboard-metrics?tenantId=${compId}`;
      const res = await api.request(url);
      if (res.success) {
        setComplianceMetrics(res.data);
      }
    } catch (err) {
      console.error('Failed to load compliance metrics:', err);
    }
  };

  const handleGlobalComplianceSweep = async () => {
    setComplianceSweepLoading(true);
    try {
      const url = selectedCompanyForCompliance === 'ALL'
        ? '/compliance/check'
        : `/compliance/check?tenantId=${selectedCompanyForCompliance}`;
      const res = await api.request(url, { method: 'POST' });
      if (res.success) {
        triggerAlert('Compliance verification sweep completed successfully.');
        loadComplianceMetrics(selectedCompanyForCompliance);
      }
    } catch (err: any) {
      triggerAlert('Failed to run compliance sweep: ' + err.message);
    } finally {
      setComplianceSweepLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'compliance') {
      loadComplianceMetrics(selectedCompanyForCompliance);
    }
  }, [activeTab, selectedCompanyForCompliance]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login?error=expired');
        return;
      }
      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== 'SUPER_ADMIN') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    }
    loadData();
  }, []);

  const handleLogout = async (allDevices: boolean = false) => {
    await api.logout(allDevices);
    router.push('/login');
  };

  const handleSebiCertificateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.target;
    const file = inputElement.files?.[0];
    if (!file) return;

    setSebiCertificate(file);
    setIsDocumentValid(true);
    setPdfPreviewData(null);

    if (file.type !== 'application/pdf') {
      setFormError('Please upload a valid PDF file for SEBI Certificate.');
      return;
    }

    setIsParsingPdf(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const formData = new FormData();
      formData.append('sebiCertificate', file);

      const res = await api.parseSebiCertificate(formData);

      if (res.success && res.data) {
        const { sebiRegistration: reg, companyName: name, certificateValidity: val, address: addr } = res.data;
        const newParsed = { ...parsedFields };

        if (reg) { setSebiRegistration(reg); newParsed.sebiRegistration = true; }
        if (name) { setCompanyName(name); newParsed.companyName = true; }
        if (val) { setCertificateValidity(val); newParsed.certificateValidity = true; }
        if (addr) { setAddress(addr); newParsed.address = true; }
        setParsedFields(newParsed);

        if (reg && name && val && addr) {
          setPdfPreviewData(res.data);
          setShowPdfConfirmModal(true);
        } else {
          setFormSuccess('SEBI Certificate attached! Detected fields auto-filled below. Please review or fill any remaining details.');
        }
      } else {
        setFormSuccess('SEBI Certificate attached. Please enter or verify company details below.');
      }
    } catch (err: any) {
      setFormSuccess('SEBI Certificate attached. Please enter or verify company details below.');
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleConfirmPdf = () => {
    if (pdfPreviewData) {
      const { sebiRegistration: reg, certificateValidity: val, companyName: name, address: addr } = pdfPreviewData;
      const newParsed = { ...parsedFields };

      if (reg) { setSebiRegistration(reg); newParsed.sebiRegistration = true; }
      if (val) { setCertificateValidity(val); newParsed.certificateValidity = true; }
      if (name) { setCompanyName(name); newParsed.companyName = true; }
      if (addr) { setAddress(addr); newParsed.address = true; }

      setParsedFields(newParsed);
      setIsDocumentValid(true);
    }
    setShowPdfConfirmModal(false);
  };

  const handleNismCertificateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.target;
    const file = inputElement.files?.[0];
    if (!file) return;

    setNismCertificate(file);
    setNismPreviewData(null);

    if (file.type !== 'application/pdf') {
      setFormError('Please upload a valid PDF file for NISM Certificate.');
      return;
    }

    setIsParsingPdf(true);
    try {
      const formData = new FormData();
      formData.append('nismCertificate', file);

      const res = await api.parseNismCertificate(formData);

      if (res.success && res.data) {
        if (res.data.nismValidity) {
          setNismValidity(res.data.nismValidity);
        }
        if (res.data.name && !ownerName) {
          setOwnerName(res.data.name);
        }
        if (res.data.nismRegistration && res.data.name && res.data.nismValidity) {
          setNismPreviewData(res.data);
          setShowNismConfirmModal(true);
        }
      }
    } catch (err: any) {
      // Keep file attached
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleConfirmNism = () => {
    if (nismPreviewData) {
      if (nismPreviewData.nismValidity) {
        setNismValidity(nismPreviewData.nismValidity);
      }
    }
    setShowNismConfirmModal(false);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sebiCertificate) {
      setFormError('Please upload the SEBI Certificate PDF file.');
      return;
    }
    if (!nismCertificate) {
      setFormError('Please upload the NISM Certificate PDF file.');
      return;
    }

    const isConfirmed = await confirm("Are you sure you want to register this company?", "Confirm Registration");
    if (!isConfirmed) return;

    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    setNewCreds(null);
    setDuplicateFields([]);

    const formData = new FormData();
    formData.append('companyName', companyName);
    if (panelName) formData.append('panelName', panelName);
    if (domainUrl) formData.append('domainUrl', domainUrl);
    if (mongoDbUrl) formData.append('mongoDbUrl', mongoDbUrl);
    if (dbName) formData.append('dbName', dbName);
    formData.append('companyType', companyType);
    formData.append('raType', raType);
    formData.append('ownerName', ownerName);
    formData.append('sebiRegistration', sebiRegistration);
    if (bseEnrollment) formData.append('bseEnrollment', bseEnrollment);
    formData.append('email', email);
    formData.append('mobile', mobile);
    formData.append('address', address);
    formData.append('pan', pan);
    if (gst) formData.append('gst', gst);
    if (website) formData.append('website', website);
    formData.append('certificateValidity', certificateValidity);
    formData.append('nismValidity', nismValidity);
    formData.append('depositAmount', depositAmount);

    if (sebiCertificate) formData.append('sebiCertificate', sebiCertificate);
    if (nismCertificate) formData.append('nismCertificate', nismCertificate);

    if (adminEmail) formData.append('adminEmail', adminEmail);
    if (adminPassword) formData.append('adminPassword', adminPassword);

    try {
      const res = await api.createTenant(formData);
      if (res.success) {
        setFormSuccess('Company Tenant created and onboarded successfully!');
        setNewCreds({
          ...(res.data?.adminUser || res.adminUser || {}),
          companyName: companyName,
          dbProvision: res.data?.dbProvision || res.dbProvision,
          apiSync: res.data?.apiSync || res.apiSync,
          tenantApiKey: res.data?.adminUser?.tenantApiKey || res.data?.tenant?.tenantApiKey || res.tenant?.tenantApiKey,
          domainUrl: res.data?.tenant?.domainUrl || domainUrl
        });
        loadData();
        // Clear form
        setParsedFields({ companyName: false, sebiRegistration: false, certificateValidity: false, address: false });
        setCompanyName('');
        setPanelName('');
        setDomainUrl('');
        setMongoDbUrl('');
        setDbName('');
        setCompanyType('INDIVIDUAL');
        setRaType('FULL_TIME');
        setOwnerName('');
        setSebiRegistration('');
        setBseEnrollment('');
        setEmail('');
        setAdminEmail('');
        setAdminPassword('');
        setMobile('');
        setAddress('');
        setPan('');
        setGst('');
        setWebsite('');
        setCertificateValidity('');
        setNismValidity('');
        setSebiCertificate(null);
        setNismCertificate(null);
      } else {
        setFormError(res.message || 'Onboarding failed.');
        if (res.duplicateFields) setDuplicateFields(res.duplicateFields);
      }
    } catch (err: any) {
      setFormError(err.message || 'Onboarding failed.');
      if (err.duplicateFields) setDuplicateFields(err.duplicateFields);
    } finally {
      setFormLoading(false);
    }
  };

  const openConfirmModal = (type: string, id: string) => {
    setConfirmAction({ type, id });
    setConfirmPassword('');
    if (type === 'PERMANENT_DELETE') {
      setIsPasswordPromptOpen(true);
    } else {
      setIsConfirmModalOpen(true);
    }
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    try {
      if (type === 'SUSPEND') await api.toggleTenantStatus(id, 'SUSPENDED');
      else if (type === 'ACTIVATE') await api.toggleTenantStatus(id, 'ACTIVE');
      else if (type === 'DELETE') await api.request(`/super-admin/tenants/${id}`, { method: 'DELETE' });
      else if (type === 'RESTORE') await api.request(`/super-admin/tenants/${id}/restore`, { method: 'POST' });
      else if (type === 'PERMANENT_DELETE') {
        if (!confirmPassword) {
          triggerAlert('Please enter your password to confirm permanent deletion.');
          return;
        }
        await api.request(`/super-admin/tenants/${id}/permanent`, {
          method: 'DELETE',
          body: JSON.stringify({ password: confirmPassword })
        });
      }

      loadData();
      setIsConfirmModalOpen(false);
      setConfirmPassword('');
    } catch (err: any) {
      triggerAlert('Action failed: ' + err.message);
    }
  };

  const handleImpersonate = async (id: string) => {
    try {
      const res = await api.request(`/super-admin/tenants/${id}/impersonate`, { method: 'POST' });
      const data = res.data || res;
      if (data.accessToken) {
        const currentToken = localStorage.getItem('accessToken');
        const currentUserStr = localStorage.getItem('user');
        if (currentToken && currentUserStr) {
          localStorage.setItem('superAdminToken', currentToken);
          localStorage.setItem('superAdminUser', currentUserStr);
        }
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenantId', data.user.tenantId);
        router.push('/admin');
      } else {
        triggerAlert('Failed to get access token');
      }
    } catch (err: any) {
      triggerAlert('Impersonate failed: ' + err.message);
    }
  };

  const openViewModal = async (id: string) => {
    try {
      const res = await api.request(`/super-admin/tenants/${id}`);
      const data = res.data || res;
      setViewData(data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      triggerAlert('Failed to load tenant details');
    }
  };

  const openEditModal = async (id: string) => {
    try {
      const res = await api.request(`/super-admin/tenants/${id}`);
      const data = res.data || res;
      setEditData({
        id,
        companyName: data.tenant?.companyName || '',
        panelName: data.tenant?.panelName || '',
        domainUrl: data.tenant?.domainUrl || '',
        mongoDbUrl: data.tenant?.mongoDbUrl || '',
        dbName: data.tenant?.dbName || '',
        tenantApiKey: data.tenant?.tenantApiKey || '',
        companyType: data.tenant?.companyType || 'INDIVIDUAL',
        raType: data.tenant?.raType || 'FULL_TIME',
        sebiRegistration: data.tenant?.sebiRegistration || '',
        bseEnrollment: data.tenant?.bseEnrollment || '',
        pan: data.tenant?.pan || '',
        website: data.tenant?.website || '',
        certificateValidity: data.tenant?.certificateValidity ? new Date(data.tenant.certificateValidity).toISOString().split('T')[0] : '',
        nismValidity: data.tenant?.nismValidity ? new Date(data.tenant.nismValidity).toISOString().split('T')[0] : '',
        depositAmount: data.tenant?.depositAmount !== undefined && data.tenant?.depositAmount !== null ? String(data.tenant.depositAmount) : '',
        certificateUrl: data.tenant?.certificateUrl || '',
        nismCertificateUrl: data.tenant?.nismCertificateUrl || '',
        address: data.tenant?.address || '',
        gst: data.tenant?.gst || '',
        tenantMobile: data.tenant?.mobile || '',
        adminName: data.admin ? `${data.admin.firstName || ''} ${data.admin.lastName || ''}`.trim() : (data.tenant?.ownerName || ''),
        adminMobile: data.admin?.mobile || '',
        adminEmail: data.admin?.email || '',
        adminStatus: data.admin?.status || 'ACTIVE',
        adminPassword: ''
      });
      setProvisionResultMsg(null);
      setApiSyncResultMsg(null);
      setEditSebiCertificate(null);
      setEditNismCertificate(null);

      try {
        const historyRes = await api.getTenantDocumentHistory(id);
        if (historyRes.success) setDocumentHistory(historyRes.data);
        else setDocumentHistory([]);
      } catch (e) {
        setDocumentHistory([]);
      }

      setIsEditModalOpen(true);
    } catch (err: any) {
      triggerAlert('Failed to load tenant details');
    }
  };

  const openCompanyClientsModal = async (company: any) => {
    setSelectedCompanyForClients(company);
    setIsClientsModalOpen(true);
    setCompanyClientsData({
      loading: true,
      error: null,
      domainUrl: company.domainUrl || company.website || null,
      company,
      data: []
    });

    try {
      const res = await api.getTenantClients(company.id);
      if (res && res.success) {
        setCompanyClientsData({
          loading: false,
          error: null,
          source: res.source,
          domainUrl: res.domainUrl || company.domainUrl,
          company: res.company || company,
          data: res.data || []
        });
      } else {
        setCompanyClientsData({
          loading: false,
          error: res?.message || 'Failed to fetch clients',
          source: 'LOCAL_DATABASE',
          domainUrl: company.domainUrl,
          company,
          data: []
        });
      }
    } catch (err: any) {
      setCompanyClientsData({
        loading: false,
        error: err.message || 'Failed to connect to domain API',
        source: 'LOCAL_DATABASE',
        domainUrl: company.domainUrl,
        company,
        data: []
      });
    }
  };

  const handleRefreshCompanyClients = () => {
    if (selectedCompanyForClients) {
      openCompanyClientsModal(selectedCompanyForClients);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = await confirm("Are you sure you want to save these changes?", "Confirm Edit Tenant");
    if (!isConfirmed) return;

    setIsSavingTenant(true);
    try {
      const formData = new FormData();
      Object.entries(editData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      if (editSebiCertificate) formData.append('sebiCertificate', editSebiCertificate);
      if (editNismCertificate) formData.append('nismCertificate', editNismCertificate);

      const res = await api.request(`/super-admin/tenants/${editData.id}`, {
        method: 'PUT',
        body: formData
      });
      setIsEditModalOpen(false);
      triggerAlert(res.message || 'Tenant updated and saved to database successfully.');
      loadData();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || (err?.response?.data?.errors && err.response.data.errors.join(', ')) || err?.message || 'Failed to update tenant';
      triggerAlert('Failed to update: ' + errMsg);
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleManualProvisionDb = async (tenantId: string) => {
    setIsProvisioningDb(true);
    setProvisionResultMsg(null);
    try {
      const res = await api.provisionTenantDb(tenantId);
      if (res.success) {
        setProvisionResultMsg({ success: true, message: res.message || 'Tenant database provisioned successfully.' });
        triggerAlert(res.message || 'Dedicated MongoDB provisioned and synced successfully.');
        loadData();
      } else {
        setProvisionResultMsg({ success: false, message: res.message || 'Database provisioning failed.' });
        triggerAlert(res.message || 'Database provisioning failed.');
      }
    } catch (err: any) {
      setProvisionResultMsg({ success: false, message: err.message || 'Database provisioning failed.' });
      triggerAlert(err.message || 'Database provisioning failed.');
    } finally {
      setIsProvisioningDb(false);
    }
  };

  const handleManualSyncApi = async (tenantId: string, targetUrl?: string) => {
    setIsSyncingApi(true);
    setApiSyncResultMsg(null);
    try {
      const res = await api.syncTenantApi(tenantId, targetUrl);
      if (res.success) {
        setApiSyncResultMsg({ success: true, message: res.message || 'Tenant synced successfully via API.' });
        triggerAlert(res.message || 'Tenant synced successfully via API.');
        loadData();
      } else {
        setApiSyncResultMsg({ success: false, message: res.message || 'API sync failed.' });
        triggerAlert(res.message || 'API sync failed.');
      }
    } catch (err: any) {
      setApiSyncResultMsg({ success: false, message: err.message || 'API sync failed.' });
      triggerAlert(err.message || 'API sync failed.');
    } finally {
      setIsSyncingApi(false);
    }
  };

  const handleEditRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = await confirm("Are you sure you want to update this rule?", "Confirm Update Rule");
    if (!isConfirmed) return;

    try {
      await api.updateSuperAdminComplianceRule(editRuleData.id, editRuleData);
      setIsEditRuleModalOpen(false);
      loadData();
    } catch (err: any) {
      triggerAlert('Failed to update rule: ' + err.message);
    }
  };

  const handleToggleRuleActive = async (rule: any) => {
    const actionStr = rule.isActive ? 'disable' : 'enable';
    const isConfirmed = await confirm(`Are you sure you want to ${actionStr} this rule?`, "Confirm Action");
    if (!isConfirmed) return;

    try {
      await api.updateSuperAdminComplianceRule(rule.id, { ...rule, isActive: !rule.isActive });
      loadData();
    } catch (err: any) {
      triggerAlert('Failed to toggle rule: ' + err.message);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = await confirm("Are you sure you want to change your password?", "Confirm Password Change");
    if (!isConfirmed) return;

    setProfileMessage('');
    setProfileError('');
    try {
      await api.request('/super-admin/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setProfileMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setProfileError('Failed to update password: ' + err.message);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.sebiRegistration.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.pan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-dvh bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex font-sans selection:bg-primary-500/30 overflow-hidden relative">
      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-premium-cards border border-premium-border flex items-center justify-center"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="w-5 h-5 text-premium-text" /> : <Menu className="w-5 h-5 text-premium-text" />}
      </button>

      {/* Premium Sidebar (Blue in Light Mode) */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col shrink-0 ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${!mobileMenuOpen && isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>

        {/* Brand */}
        <div className={`h-24 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {user?.tenantLogo ? (
              <img src={user.tenantLogo} alt={user?.tenantName || appName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
            ) : appLogo ? (
              <img src={appLogo} alt={appName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
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
              className="hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 hide-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Landmark },
            { id: 'companies', label: 'RA Companies', icon: Users },
            { id: 'matrix', label: 'Compliance Matrix', icon: ShieldCheck },
            { id: 'compliance', label: 'Compliance Center', icon: AlertTriangle },
            { id: 'audit', label: 'Audit Trails', icon: ClipboardList },
            { id: 'resources', label: 'Resources', icon: FileText }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-white/20 text-white font-semibold shadow-inner'
                  : 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-white' : 'text-blue-200 dark:text-white/50 group-hover:text-white'}`} />
                {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
                {!isSidebarCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                )}
              </button>
            )
          })}
        </div>

        {/* User Footer */}
        <div className={`p-4 border-t border-blue-800 dark:border-premium-border relative overflow-hidden flex flex-col ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
          <div
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`bg-white/10 backdrop-blur-md rounded-2xl flex items-center gap-3 border border-white/10 hover:border-white/30 transition-all duration-300 group relative overflow-hidden cursor-pointer ${isSidebarCollapsed ? 'p-2 justify-center flex-col' : 'p-4'}`}>
            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite]" />

            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-ping opacity-75" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-[0_0_10px_var(--tw-colors-rose-500)] relative z-10">
                S
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-premium-success border-2 border-premium-bg rounded-full z-20" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 relative z-10">
                <p className="font-bold text-sm truncate text-white">Super Admin</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-rose-500" />
                  <p className="text-[10px] font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-orange-200 to-rose-500 animate-pulse">
                    System Control
                  </p>
                </div>
              </div>
            )}

            {!isSidebarCollapsed && (
              <div className="relative z-10 shrink-0 mr-1"><ThemeToggle /></div>
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

      {/* Main Content Area */}
      <main className="flex-grow p-10 overflow-y-auto max-w-[1600px] mx-auto">

        {/* UNIFIED PAGE HEADER FOR TABS WITHOUT NATIVE HEADERS */}
        {(() => {


          const tabsMissingHeader = [
            'dashboard',
            'companies',
            'matrix',
            'audit',
            'resources',
            'compliance',
            'profile'
          ];

          if (!tabsMissingHeader.includes(activeTab)) return null;

          const tabLabels: Record<string, { title: string, desc: string }> = {
            dashboard: { title: 'Dashboard', desc: 'Manage system pricing and tiers' },
            companies: { title: 'Companies', desc: 'Manage system pricing and tiers' },
            matrix: { title: 'Pricing Matrix', desc: 'Manage system pricing and tiers' },
            audit: { title: 'Compliance Audit', desc: 'System-wide compliance and event logs' },
            resources: { title: 'Global Resources', desc: 'Manage global resource documents' },
            compliance: { title: 'Compliance Telemetry', desc: 'Monitor compliance across all tenants' },
            profile: { title: 'Super Admin Profile', desc: 'Manage your profile and settings' }
          };

          const currentNav = tabLabels[activeTab];
          if (!currentNav) return null;

          return (
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-300 dark:border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentNav.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {currentNav.desc}
                </p>
              </div>
            </div>
          );
        })()}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && <DashboardTab telemetry={telemetry} />}

        {/* 2. COMPANIES TAB */}
        {activeTab === 'companies' && (
          <CompaniesTab
            companies={companies}
            filteredCompanies={filteredCompanies}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPageCompanies={currentPageCompanies}
            setCurrentPageCompanies={setCurrentPageCompanies}
            openViewModal={openViewModal}
            openEditModal={openEditModal}
            openClientsModal={openCompanyClientsModal}
            openConfirmModal={openConfirmModal}
            handleImpersonate={handleImpersonate}
            setIsAddCompanyModalOpen={setIsAddCompanyModalOpen}
            setFormSuccess={setFormSuccess}
            setFormError={setFormError}
            setNewCreds={setNewCreds}
          />
        )}

        {/* 2.5 MATRIX TAB */}
        {activeTab === 'matrix' && (
          <MatrixTab
            complianceRules={complianceRules}
            currentPageMatrix={currentPageMatrix}
            setCurrentPageMatrix={setCurrentPageMatrix}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            handleToggleRuleActive={handleToggleRuleActive}
            setEditRuleData={setEditRuleData}
            setIsEditRuleModalOpen={setIsEditRuleModalOpen}
          />
        )}

        {/* 3. AUDIT TAB */}
        {activeTab === 'audit' && (
          <AuditTab
            auditLogs={auditLogs}
            currentPageLogs={currentPageLogs}
            setCurrentPageLogs={setCurrentPageLogs}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        )}

        {/* 4. RESOURCES TAB */}
        {activeTab === 'resources' && (
          <SuperAdminResourcesTab triggerAlert={triggerAlert} />
        )}

        {/* 4.5 COMPLIANCE TAB */}
        {activeTab === 'compliance' && (
          <ComplianceTab
            selectedCompanyForCompliance={selectedCompanyForCompliance}
            setSelectedCompanyForCompliance={setSelectedCompanyForCompliance}
            companies={companies}
            complianceSweepLoading={complianceSweepLoading}
            handleGlobalComplianceSweep={handleGlobalComplianceSweep}
            complianceMetrics={complianceMetrics}
            activeComplianceSubTab={activeComplianceSubTab}
            setActiveComplianceSubTab={setActiveComplianceSubTab}
            currentPageAlerts={currentPageAudits}
            itemsPerPage={itemsPerPage}
            setCurrentPageAlerts={setCurrentPageAudits}
            setItemsPerPage={setItemsPerPage}
          />
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <SuperAdminProfilePage />
        )}

        {/* Onboard Company Modal */}
        {isAddCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setIsAddCompanyModalOpen(false)}
                className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10"
              >
                <XCircle className="h-5 w-5" />
              </button>

              <h2 className="text-2xl font-bold mb-2">Onboard New RA Advisor Company</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">Initialize a new SEBI Registered Research Analyst entity workspace</p>

              {formSuccess && (
                <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm rounded-2xl flex flex-col space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-lg text-emerald-700 dark:text-emerald-300 block">{formSuccess}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Admin account and database setup completed successfully.</span>
                    </div>
                  </div>
                  {newCreds && (
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Name</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{newCreds.companyName || companyName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Login ID (Email)</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{newCreds.email}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(newCreds.email);
                              setCopiedCreds(true);
                              setTimeout(() => setCopiedCreds(false), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            title="Copy Email"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Password</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                            {showAdminPassword ? (newCreds.generatedPassword || newCreds.password) : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(newCreds.generatedPassword || newCreds.password);
                              setCopiedCreds(true);
                              setTimeout(() => setCopiedCreds(false), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            title="Copy Password"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {newCreds.tenantApiKey && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tenant API Key</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold max-w-[220px] truncate">{newCreds.tenantApiKey}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(newCreds.tenantApiKey);
                                setCopiedApiKey(true);
                                setTimeout(() => setCopiedApiKey(false), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                              title="Copy Tenant API Key"
                            >
                              {copiedApiKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {newCreds.apiSync && (
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">Remote API Sync:</span>
                          <span className={`font-semibold px-2.5 py-1 rounded-lg ${newCreds.apiSync.success ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                            {newCreds.apiSync.success ? 'Synced via API & Ready for Login' : (newCreds.apiSync.message || 'API Sync Notice')}
                          </span>
                        </div>
                      )}
                      {newCreds.dbProvision && (
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500">Dedicated MongoDB Status:</span>
                          <span className={`font-semibold px-2.5 py-1 rounded-lg ${newCreds.dbProvision.success ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                            {newCreds.dbProvision.success ? 'Provisioned & Ready for Build' : (newCreds.dbProvision.message || 'Connection Notice')}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Company: ${newCreds.companyName || companyName}\nAdmin ID: ${newCreds.email}\nAdmin Password: ${newCreds.generatedPassword || newCreds.password}\nTenant API Key: ${newCreds.tenantApiKey || 'N/A'}\nLogin URL: ${window.location.origin}/login`;
                            navigator.clipboard.writeText(text);
                            setCopiedCreds(true);
                            setTimeout(() => setCopiedCreds(false), 2000);
                          }}
                          className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1.5"
                        >
                          {copiedCreds ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedCreds ? 'Copied all credentials to clipboard!' : 'Copy All Credentials'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSuccess(null);
                        setNewCreds(null);
                        setIsAddCompanyModalOpen(false);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm rounded-xl font-medium flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{formError}</span>
                </div>
              )}

              {!formSuccess && (
                <form onSubmit={handleCreateCompany} className="space-y-6">
                  {/* 1. Company Profile */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center space-x-2">
                      <Landmark className="h-4 w-4 text-primary-500" />
                      <span>Company & SEBI Registration</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Company Legal Name *</label>
                        {parsedFields.companyName ? (
                          <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold flex items-center shadow-inner h-[42px]">
                            {companyName}
                          </div>
                        ) : (
                          <input type="text" required value={companyName} onFocus={(e) => {
                            if (!sebiCertificate) {
                              e.target.blur();
                              setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                            }
                          }} onChange={e => setCompanyName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="Beta Advisors Pvt Ltd" />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Company Type *</label>
                        <select value={companyType} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                          }
                        }} onChange={e => setCompanyType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors h-[42px]">
                          <option value="INDIVIDUAL">Individual</option>
                          <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                          <option value="PARTNERSHIP">Partnership</option>
                          <option value="LLP">LL.P</option>
                          <option value="PVT_LTD">Pvt. Ltd.</option>
                          <option value="PUBLIC_LTD">Public Ltd.</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">RA Type *</label>
                        <select value={raType} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                          }
                        }} onChange={e => setRaType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors h-[42px]">
                          <option value="FULL_TIME">Full Time RA</option>
                          <option value="PART_TIME">Part Time RA</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Owner / Director Name *</label>
                        <input type="text" required value={ownerName} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                          }
                        }} onChange={e => setOwnerName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="John Doe" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Registration No *</label>
                        {parsedFields.sebiRegistration ? (
                          <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold flex items-center shadow-inner h-[42px] uppercase">
                            {sebiRegistration}
                          </div>
                        ) : (
                          <div className="relative">
                            <input type="text" required value={sebiRegistration} onFocus={(e) => {
                              if (!sebiCertificate) {
                                e.target.blur();
                                setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                              }
                            }} onChange={e => setSebiRegistration(e.target.value.toUpperCase())} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('SEBI Registration') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono`}
                              placeholder="INZ000000000"
                            />
                            {duplicateFields.includes('SEBI Registration') && <p className="text-rose-500 text-xs mt-1 font-semibold">This SEBI Registration already exists.</p>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Company PAN *</label>
                        <div className="relative">
                          <input type="text" required value={pan} onFocus={() => {
                            if (duplicateFields.includes('PAN')) {
                              setDuplicateFields(duplicateFields.filter(f => f !== 'PAN'));
                            }
                          }} onChange={e => setPan(formatPan(e.target.value))} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('PAN') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors uppercase`}
                            placeholder="ABCDE1234F" />
                          {duplicateFields.includes('PAN') && <p className="text-rose-500 text-xs mt-1 font-semibold">This PAN already exists.</p>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">GST Identification</label>
                        <div className="relative">
                          <input type="text" value={gst} onFocus={(e) => {
                            if (!sebiCertificate) {
                              e.target.blur();
                              setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                            }
                          }} onChange={e => setGst(e.target.value.toUpperCase())} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('GST') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                            placeholder="Optional" />
                          {duplicateFields.includes('GST') && <p className="text-rose-500 text-xs mt-1 font-semibold">This GST already exists.</p>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Website URL</label>
                        <input type="url" value={website} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                          }
                        }} onChange={e => setWebsite(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">BSE Enrollment Code</label>
                        <input type="text" value={bseEnrollment} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                          }
                        }} onChange={e => setBseEnrollment(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="Optional" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Admin Login Credentials Section */}
                  <div className="bg-primary-500/5 border border-primary-500/20 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>Admin Login Credentials (ID & Password)</span>
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Used by Admin to log in to this company's workspace & deployed builds</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Login ID / Email *</label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={adminEmail || email}
                            onChange={e => {
                              setAdminEmail(e.target.value);
                              setEmail(e.target.value);
                            }}
                            className={`w-full bg-white dark:bg-slate-900 border ${duplicateFields.includes('Email') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                            placeholder="admin@company.com"
                          />
                          {duplicateFields.includes('Email') && <p className="text-rose-500 text-xs mt-1 font-semibold">This Email is already registered.</p>}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Admin Password *</label>
                          <button
                            type="button"
                            onClick={generateRandomPassword}
                            className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Generate</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? "text" : "password"}
                            required
                            value={adminPassword}
                            onChange={e => setAdminPassword(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors font-mono"
                            placeholder="e.g. Admin@12345"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Mobile *</label>
                        <input
                          type="text"
                          required
                          value={mobile}
                          onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className={`w-full bg-white dark:bg-slate-900 border ${duplicateFields.includes('Mobile') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Dedicated Database & Deployment Settings Section */}
                  <div className="bg-slate-100/70 dark:bg-slate-950/40 border border-slate-300 dark:border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                        <Database className="h-4 w-4 text-indigo-500" />
                        <span>Dedicated Database & Deployment Settings (Optional)</span>
                      </h3>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">Auto DB Provisioning</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">MongoDB Connection URL</label>
                        <input
                          type="text"
                          value={mongoDbUrl}
                          onChange={e => setMongoDbUrl(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors font-mono"
                          placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname or mongodb://..."
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          If provided, this database will be automatically seeded with Roles, Permissions, Default Pages, and the Admin User.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">DB Name</label>
                        <input
                          type="text"
                          value={dbName}
                          onChange={e => setDbName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                          placeholder="e.g. beta_compliance_db"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Panel Name</label>
                        <input
                          type="text"
                          value={panelName}
                          onChange={e => setPanelName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                          placeholder="Beta Advisors Portal"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Custom Domain URL</label>
                        <input
                          type="url"
                          value={domainUrl}
                          onChange={e => setDomainUrl(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                          placeholder="https://advisors.yourcompany.com"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Validity & Certificates */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <span>Validity & Document Uploads</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Validity Date *</label>
                        {parsedFields.certificateValidity ? (
                          <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold flex items-center shadow-inner h-[42px]">
                            {certificateValidity}
                          </div>
                        ) : (
                          <input type="date" required value={certificateValidity} onFocus={(e) => {
                            if (!sebiCertificate) {
                              e.target.blur();
                              setFormError('Please upload the SEBI Certificate PDF first to extract and auto-fill details.'); setTimeout(() => setFormError(null), 5000);
                            }
                          }} onChange={e => setCertificateValidity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">NISM Validity Date *</label>
                        <input type="date" required value={nismValidity} onFocus={(e) => {
                          if (!nismCertificate) {
                            e.target.blur();
                          }
                        }} onChange={e => setNismValidity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Deposit Float (INR) *</label>
                        <input type="number" required value={depositAmount} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                          }
                        }} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Corporate Office Address *</label>
                      {parsedFields.address ? (
                        <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold shadow-inner min-h-[42px]">
                          {address}
                        </div>
                      ) : (
                        <input type="text" required value={address} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                          }
                        }} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="BKC Commercial Towers..." />
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Certificate File * {isParsingPdf && <span className="text-primary-600 dark:text-primary-400 ml-2">(Parsing PDF...)</span>}</label>
                        {sebiCertificate ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold min-h-[42px]">
                            <span className="truncate max-w-[200px]">{sebiCertificate.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSebiCertificate(null);
                                setCompanyName('');
                                setSebiRegistration('');
                                setCertificateValidity('');
                                setAddress('');
                                setParsedFields({ companyName: false, sebiRegistration: false, certificateValidity: false, address: false });
                                setIsDocumentValid(null);
                              }}
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                            >
                              Reupload
                            </button>
                          </div>
                        ) : (
                          <input type="file" ref={sebiFileInputRef} required onChange={handleSebiCertificateChange} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400 hover:file:bg-primary-500/20" accept=".pdf" />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">NISM certificate of PO/Researcher *</label>
                        {nismCertificate ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold min-h-[42px]">
                            <span className="truncate max-w-[200px]">{nismCertificate.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNismCertificate(null);
                                setNismValidity('');
                              }}
                              className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                            >
                              Reupload
                            </button>
                          </div>
                        ) : (
                          <input type="file" ref={nismFileInputRef} required onChange={handleNismCertificateChange} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400 hover:file:bg-primary-500/20" accept=".pdf" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-slate-300 dark:border-white/5">
                    <button type="button" onClick={() => setIsAddCompanyModalOpen(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">
                      Cancel
                    </button>
                    <button type="submit" disabled={formLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center space-x-2 text-white disabled:opacity-50">
                      {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <span>Onboard & Setup Company</span>
                    </button>
                  </div>
                </form>
              )}

              {formSuccess && (
                <div className="flex justify-end pt-6 border-t border-slate-300 dark:border-white/5">
                  <button type="button" onClick={() => setIsAddCompanyModalOpen(false)} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
              <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Confirm Action</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to {confirmAction?.type.toLowerCase().replace('_', ' ')} this tenant?</p>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setIsConfirmModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={executeConfirmAction} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Password Prompt Modal */}
        {isPasswordPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
              <Key className="h-12 w-12 text-primary-600 dark:text-primary-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Please enter your Super Admin password to proceed.</p>
              <div className="mb-6 text-left">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="password" required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition placeholder:text-slate-500"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              <div className="flex justify-center space-x-3">
                <button onClick={() => setIsPasswordPromptOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button
                  onClick={() => {
                    if (!confirmPassword) {
                      triggerAlert('Please enter your password.');
                      return;
                    }
                    setIsPasswordPromptOpen(false);
                    setIsConfirmModalOpen(true);
                  }}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && viewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
              <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
                <XCircle className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-bold mb-6">Tenant Details</h2>
              <div className="space-y-6">
                <div className="bg-slate-100 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-300 dark:border-white/5">
                  <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-4 uppercase tracking-wider">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500 block text-xs">Name</span>{viewData.tenant?.companyName || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">Panel Name</span>{viewData.tenant?.panelName || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">Domain URL</span>{viewData.tenant?.domainUrl ? <a href={viewData.tenant.domainUrl} target="_blank" rel="noreferrer" className="text-primary-500 hover:underline">{viewData.tenant.domainUrl}</a> : 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">DB Name</span>{viewData.tenant?.dbName || 'Default DB'}</div>
                    <div><span className="text-slate-500 block text-xs">SEBI Reg</span>{viewData.tenant?.sebiRegistration || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">PAN</span>{viewData.tenant?.pan || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">GST</span>{viewData.tenant?.gst || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">Tenant API Key</span><span className="font-mono text-xs text-slate-400 truncate block" title={viewData.tenant?.tenantApiKey}>{viewData.tenant?.tenantApiKey || 'N/A'}</span></div>
                    <div className="col-span-2"><span className="text-slate-500 block text-xs">Address</span>{viewData.tenant?.address || 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-300 dark:border-white/5">
                  <h3 className="text-sm font-bold text-emerald-600 dark:emerald-400 mb-4 uppercase tracking-wider">Admin User</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500 block text-xs">Name</span>{viewData.admin?.firstName} {viewData.admin?.lastName}</div>
                    <div><span className="text-slate-500 block text-xs">Email</span>{viewData.admin?.email}</div>
                    <div><span className="text-slate-500 block text-xs">Mobile</span>{viewData.admin?.mobile || 'N/A'}</div>
                    <div><span className="text-slate-500 block text-xs">Status</span>{viewData.admin?.status}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Rule Modal */}
        {isEditRuleModalOpen && editRuleData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
              <button onClick={() => setIsEditRuleModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
                <XCircle className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Edit Compliance Rule #{editRuleData.serialNo}</h2>
              <form onSubmit={handleEditRuleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Requirement Description</label>
                  <textarea
                    rows={3}
                    value={editRuleData.requirement}
                    onChange={e => setEditRuleData({ ...editRuleData, requirement: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:border-primary-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Frequency</label>
                    <input type="text" value={editRuleData.frequency} onChange={e => setEditRuleData({ ...editRuleData, frequency: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Severity Level</label>
                    <select value={editRuleData.severityLevel} onChange={e => setEditRuleData({ ...editRuleData, severityLevel: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white appearance-none">
                      <option value="HIGH">HIGH</option>
                      <option value="MODERATE">MODERATE</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Penalty Amount / Action</label>
                  <input type="text" value={editRuleData.penaltyAmount || ''} onChange={e => setEditRuleData({ ...editRuleData, penaltyAmount: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="e.g. Γé╣10,000 per violation" />
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <input type="checkbox" id="isActive" checked={editRuleData.isActive} onChange={e => setEditRuleData({ ...editRuleData, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950 text-primary-600 dark:text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-900" />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300">Rule is Active (Generates Alerts/Penalties)</label>
                </div>
                <div className="pt-4 flex space-x-4">
                  <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-all">Save Rule Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
                <XCircle className="h-5 w-5" />
              </button>
              <h2 className="text-2xl font-bold mb-6">Edit Tenant</h2>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Name</label>
                    <input type="text" value={editData.companyName} onChange={e => setEditData({ ...editData, companyName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Type</label>
                    <select value={editData.companyType} onChange={e => setEditData({ ...editData, companyType: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white h-[38px]">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                      <option value="PARTNERSHIP">Partnership</option>
                      <option value="LLP">LL.P</option>
                      <option value="PVT_LTD">Pvt. Ltd.</option>
                      <option value="PUBLIC_LTD">Public Ltd.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">RA Type</label>
                    <select value={editData.raType} onChange={e => setEditData({ ...editData, raType: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white h-[38px]">
                      <option value="FULL_TIME">Full Time RA</option>
                      <option value="PART_TIME">Part Time RA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Registration</label>
                    <input type="text" value={editData.sebiRegistration} onChange={e => setEditData({ ...editData, sebiRegistration: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">BSE Enrollment No</label>
                    <input type="text" value={editData.bseEnrollment} onChange={e => setEditData({ ...editData, bseEnrollment: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">PAN</label>
                    <input type="text" value={editData.pan} onChange={e => setEditData({ ...editData, pan: formatPan(e.target.value) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Website</label>
                    <input type="text" value={editData.website} onChange={e => setEditData({ ...editData, website: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Panel Name</label>
                    <input type="text" value={editData.panelName || ''} onChange={e => setEditData({ ...editData, panelName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="e.g. Beta Advisors Portal" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Domain URL</label>
                    <input type="text" value={editData.domainUrl || ''} onChange={e => setEditData({ ...editData, domainUrl: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="https://betaadvisors.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">DB Name</label>
                    <input type="text" value={editData.dbName || ''} onChange={e => setEditData({ ...editData, dbName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="e.g. beta_advisors_db" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">MongoDB Connection URL</label>
                    <input type="text" value={editData.mongoDbUrl || ''} onChange={e => setEditData({ ...editData, mongoDbUrl: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white font-mono" placeholder="mongodb+srv://user:pass@cluster.mongodb.net/dbname" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Validity Date</label>
                    <input type="date" value={editData.certificateValidity} onChange={e => setEditData({ ...editData, certificateValidity: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">NISM Validity Date</label>
                    <input type="date" value={editData.nismValidity} onChange={e => setEditData({ ...editData, nismValidity: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">GST</label>
                    <input type="text" value={editData.gst} onChange={e => setEditData({ ...editData, gst: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Mobile</label>
                    <input type="text" value={editData.tenantMobile} onChange={e => setEditData({ ...editData, tenantMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Deposit Float (INR)</label>
                    <input type="number" value={editData.depositAmount} onChange={e => setEditData({ ...editData, depositAmount: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Address</label>
                    <input type="text" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>

                  <div className="col-span-2 my-2 border-t border-slate-400 dark:border-white/10 pt-4">
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-4">Certificates</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Certificate</label>
                    {editData.certificateUrl && (
                      <div className="mb-2">
                        <a href={`${api.getBaseUrl()}${editData.certificateUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline text-xs">View Current SEBI Certificate</a>
                      </div>
                    )}
                    <input type="file" onChange={e => setEditSebiCertificate(e.target.files?.[0] || null)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400" accept=".pdf" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">NISM Certificate</label>
                    {editData.nismCertificateUrl && (
                      <div className="mb-2">
                        <a href={`${api.getBaseUrl()}${editData.nismCertificateUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline text-xs">View Current NISM Certificate</a>
                      </div>
                    )}
                    <input type="file" onChange={e => setEditNismCertificate(e.target.files?.[0] || null)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400" accept=".pdf" />
                  </div>

                  {documentHistory.length > 0 && (
                    <div className="col-span-2 mt-4">
                      <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Document Upload History</h4>
                      <div className="bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-center">S.No</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>File Name</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documentHistory.map((doc: any, index: number) => (
                              <TableRow key={doc.id}>
                                <TableCell className="text-center font-mono text-slate-500">{index + 1}</TableCell>
                                <TableCell className="whitespace-nowrap">{new Date(doc.uploadedAt).toLocaleString()}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.docType === 'SEBI_CERTIFICATE' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                    {doc.docType.replace('_', ' ')}
                                  </span>
                                </TableCell>
                                <TableCell className="truncate max-w-[150px]" title={doc.fileName}>{doc.fileName}</TableCell>
                                <TableCell className="text-right">
                                  <a href={`${api.getBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 hover:underline font-semibold">Download</a>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 my-2 border-t border-slate-400 dark:border-white/10 pt-4">
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-4">Admin Details</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Name</label>
                    <input type="text" value={editData.adminName} onChange={e => setEditData({ ...editData, adminName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Email</label>
                    <input type="email" value={editData.adminEmail} onChange={e => setEditData({ ...editData, adminEmail: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Mobile</label>
                    <input type="text" value={editData.adminMobile} onChange={e => setEditData({ ...editData, adminMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">New Password (leave blank to keep)</label>
                    <input type="password" value={editData.adminPassword} onChange={e => setEditData({ ...editData, adminPassword: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="••••••••" />
                  </div>

                  {editData.tenantApiKey && (
                    <div className="col-span-2 p-3 bg-slate-100 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tenant API Key (For Remote Builds & API Sync)</span>
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold select-all">{editData.tenantApiKey}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editData.tenantApiKey);
                          setCopiedApiKey(true);
                          setTimeout(() => setCopiedApiKey(false), 2000);
                        }}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedApiKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedApiKey ? 'Copied' : 'Copy Key'}</span>
                      </button>
                    </div>
                  )}

                  <div className="col-span-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Auto-Sync Active</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clicking <strong>Save Changes</strong> will directly update and automatically sync all details, Admin password, and roles to the remote server via API in the background.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-300 dark:border-white/5">
                  <button type="button" disabled={isSavingTenant} onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSavingTenant} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20 flex items-center space-x-2">
                    {isSavingTenant && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>{isSavingTenant ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Logout Modal */}
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
              <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Logout</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to log out of the super admin console?</p>
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

        {/* PDF Confirm Modal */}
        {showPdfConfirmModal && pdfPreviewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Valid Document Detected!</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">We extracted the following details. Please confirm to auto-fill the form.</p>
              <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl text-left text-sm space-y-4 mb-6 border border-slate-300 dark:border-white/5">
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Company Name</label>
                  <input type="text" value={pdfPreviewData.companyName || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, companyName: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">SEBI Reg No</label>
                  <input type="text" value={pdfPreviewData.sebiRegistration || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, sebiRegistration: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 uppercase" />
                </div>
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Validity Date</label>
                  <input type="date" value={pdfPreviewData.certificateValidity || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, certificateValidity: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
                </div>
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Address</label>
                  <textarea value={pdfPreviewData.address || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, address: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 min-h-[60px]" />
                </div>
              </div>
              <div className="flex justify-center space-x-3">
                <button onClick={() => { setShowPdfConfirmModal(false); setSebiCertificate(null); setIsDocumentValid(false); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={handleConfirmPdf} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm & Auto-Fill</button>
              </div>
            </div>
          </div>
        )}

        {/* NISM PDF Confirm Modal */}
        {showNismConfirmModal && nismPreviewData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">NISM Certificate Detected!</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">We extracted the following details. Please confirm to auto-fill the form.</p>
              <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl text-left text-sm space-y-4 mb-6 border border-slate-300 dark:border-white/5">
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">NISM Reg No</label>
                  <input type="text" value={nismPreviewData.nismRegistration || ''} onChange={e => setNismPreviewData({ ...nismPreviewData, nismRegistration: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 uppercase" />
                </div>
                <div>
                  <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Validity Date</label>
                  <input type="date" value={nismPreviewData.nismValidity || ''} onChange={e => setNismPreviewData({ ...nismPreviewData, nismValidity: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <div className="flex justify-center space-x-3">
                <button onClick={() => { setShowNismConfirmModal(false); setNismCertificate(null); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={handleConfirmNism} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm & Auto-Fill</button>
              </div>
            </div>
          </div>
        )}

        {/* Global Custom Alert Modal */}
        {globalAlert && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className={`border rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden transform transition-all animate-in zoom-in-90 duration-300 ${globalAlert.isError
              ? 'bg-white dark:bg-slate-900 border-rose-500/30 shadow-[0_0_40px_-10px_rgba(225,29,72,0.3)]'
              : 'bg-white dark:bg-slate-900 border-indigo-500/30 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]'
              }`}>
              {/* Animated subtle background glow */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse ${globalAlert.isError ? 'bg-rose-500' : 'bg-indigo-500'
                }`} />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`p-4 rounded-2xl mb-5 shadow-inner relative ${globalAlert.isError ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'
                  }`}>
                  <div className={`absolute inset-0 rounded-2xl border ${globalAlert.isError ? 'border-rose-500/20' : 'border-indigo-500/20'
                    }`} />
                  {globalAlert.isError ? (
                    <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400 animate-[bounce_2s_infinite]" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-[bounce_2s_infinite]" />
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {globalAlert.isError ? 'Action Required' : 'Notice'}
                </h3>

                <p className="text-[13px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed mb-8 px-2">
                  {globalAlert.message}
                </p>

                <button
                  onClick={() => setGlobalAlert(null)}
                  className={`w-full py-3 px-6 font-bold text-white rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg ${globalAlert.isError
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:shadow-rose-500/25'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:shadow-indigo-500/25'
                    }`}
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Company Clients Modal (Domain API Live Access) */}
        {selectedCompanyForClients && (
          <CompanyClientsModal
            isOpen={isClientsModalOpen}
            onClose={() => setIsClientsModalOpen(false)}
            company={selectedCompanyForClients}
            clientsData={companyClientsData}
            onRefresh={handleRefreshCompanyClients}
          />
        )}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SuperAdminDashboardContent), { ssr: false });

