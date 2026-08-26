'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogOut, Plus, Landmark, Users, BellRing, ClipboardList, RefreshCw, CheckCircle2, XCircle, Search, Loader2, Eye, Edit, Trash2, Power, PowerOff, RotateCcw, AlertTriangle, Key, User, FileText, ChevronLeft, ChevronRight, Download, EyeOff, Menu, X } from 'lucide-react';
import api from '../../services/api';
import { formatPan } from '../../utils/formatters';
import SuperAdminResourcesTab from '@/components/SuperAdminResourcesTab';
import { useGlobalConfirm } from '@/components/GlobalConfirmProvider';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import dynamic from 'next/dynamic';
import SuperAdminProfilePage from './profile/page';
import DashboardTab from '../../components/super-admin/tabs/DashboardTab';
import CompaniesTab from '../../components/super-admin/tabs/CompaniesTab';
import MatrixTab from '../../components/super-admin/tabs/MatrixTab';
import AuditTab from '../../components/super-admin/tabs/AuditTab';
import ComplianceTab from '../../components/super-admin/tabs/ComplianceTab';

function SuperAdminDashboardContent() {
  const router = useRouter();
  const { confirm } = useGlobalConfirm();
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'matrix' | 'audit' | 'resources' | 'profile' | 'compliance'>('dashboard');
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
  const [companyType, setCompanyType] = useState('INDIVIDUAL');
  const [raType, setRaType] = useState('FULL_TIME');
  const [ownerName, setOwnerName] = useState('');
  const [sebiRegistration, setSebiRegistration] = useState('');
  const [bseEnrollment, setBseEnrollment] = useState('');
  const [email, setEmail] = useState('');
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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
        router.push('/login');
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
    setSebiCertificate(file || null);
    setIsDocumentValid(null);
    setPdfPreviewData(null);

    if (!file || file.type !== 'application/pdf') return;

    setIsParsingPdf(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const formData = new FormData();
      formData.append('sebiCertificate', file);

      const res = await api.parseSebiCertificate(formData);

      if (res.success) {
        if (res.data) {
          if (!res.data.sebiRegistration || !res.data.companyName || !res.data.certificateValidity || !res.data.address) {
            setIsDocumentValid(false);
            setSebiCertificate(null);
            if (inputElement) inputElement.value = '';
            triggerAlert('Invalid Document: Could not detect all SEBI Registration details (Registration No, Validity Date, Company Name, Address). Please upload a valid SEBI Certificate.');
            setFormError('Invalid Document: Could not detect all SEBI Registration details.');
          } else {
            setPdfPreviewData(res.data);
            setShowPdfConfirmModal(true);
          }
        } else {
          setIsDocumentValid(false);
          setSebiCertificate(null);
          if (inputElement) inputElement.value = '';
          if (res.message) triggerAlert(res.message);
          setFormError(res.message || 'Invalid Document.');
        }
      } else {
        if (res.message && res.message.includes('scanned image')) {
          setIsDocumentValid(true);
          setFormError(null);
          triggerAlert('Scanned Document Detected. Please fill in the SEBI details manually.');
        } else {
          setIsDocumentValid(false);
          setSebiCertificate(null);
          if (inputElement) inputElement.value = '';
          setFormError(res.message || 'Invalid Document: Unrecognized format.');
        }
      }
    } catch (err: any) {
      setIsDocumentValid(false);
      setSebiCertificate(null);
      if (inputElement) inputElement.value = '';
      triggerAlert(err.message || 'Failed to parse SEBI PDF');
      setFormError('Failed to parse PDF: ' + err.message);
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
    setNismCertificate(file || null);
    setNismPreviewData(null);

    if (!file || file.type !== 'application/pdf') return;

    setIsParsingPdf(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('nismCertificate', file);

      const res = await api.parseNismCertificate(formData);

      if (res.success) {
        if (res.data && res.data.nismRegistration && res.data.name && res.data.nismValidity) {
          setNismPreviewData(res.data);
          setShowNismConfirmModal(true);
        } else {
          setNismCertificate(null);
          if (inputElement) inputElement.value = '';
          triggerAlert('Invalid Document: Could not detect all NISM certificate details (Registration No, Validity Date, Candidate Name). Please upload a valid NISM Certificate.');
          setFormError('Invalid Document: Could not detect all NISM certificate details.');
        }
      } else {
        if (res.message && res.message.includes('scanned image')) {
          setFormError(null);
          triggerAlert('Scanned Document Detected. Please fill in the NISM details manually.');
        } else {
          setNismCertificate(null);
          if (inputElement) inputElement.value = '';
          if (res.message) triggerAlert(res.message);
          setFormError(res.message || 'Invalid NISM Document.');
        }
      }
    } catch (err: any) {
      setNismCertificate(null);
      if (inputElement) inputElement.value = '';
      triggerAlert(err.message || 'Failed to parse NISM PDF');
      setFormError('Failed to parse NISM PDF: ' + err.message);
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
    if (isDocumentValid === false || isDocumentValid === null) {
      setFormError('Please upload and confirm a valid SEBI Certificate before proceeding.');
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

    try {
      const res = await api.createTenant(formData);
      if (res.success) {
        setFormSuccess('Company Tenant created and onboarded successfully!');
        setNewCreds(res.data?.adminUser || res.adminUser);
        loadData();
        // Clear form
        setParsedFields({ companyName: false, sebiRegistration: false, certificateValidity: false, address: false });
        setCompanyName('');
        setCompanyType('INDIVIDUAL');
        setRaType('FULL_TIME');
        setOwnerName('');
        setSebiRegistration('');
        setBseEnrollment('');
        setEmail('');
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
        companyType: data.tenant?.companyType || 'INDIVIDUAL',
        raType: data.tenant?.raType || 'FULL_TIME',
        sebiRegistration: data.tenant?.sebiRegistration || '',
        bseEnrollment: data.tenant?.bseEnrollment || '',
        pan: data.tenant?.pan || '',
        website: data.tenant?.website || '',
        certificateValidity: data.tenant?.certificateValidity ? new Date(data.tenant.certificateValidity).toISOString().split('T')[0] : '',
        nismValidity: data.tenant?.nismValidity ? new Date(data.tenant.nismValidity).toISOString().split('T')[0] : '',
        depositAmount: data.tenant?.depositAmount || '',
        certificateUrl: data.tenant?.certificateUrl || '',
        nismCertificateUrl: data.tenant?.nismCertificateUrl || '',
        address: data.tenant?.address || '',
        gst: data.tenant?.gst || '',
        tenantMobile: data.tenant?.mobile || '',
        adminName: data.admin?.firstName || '',
        adminMobile: data.admin?.mobile || '',
        adminEmail: data.admin?.email || '',
        adminStatus: data.admin?.status || 'ACTIVE',
        adminPassword: ''
      });
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = await confirm("Are you sure you want to save these changes?", "Confirm Edit Tenant");
    if (!isConfirmed) return;

    try {
      const formData = new FormData();
      Object.entries(editData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, String(value));
        }
      });
      if (editSebiCertificate) formData.append('sebiCertificate', editSebiCertificate);
      if (editNismCertificate) formData.append('nismCertificate', editNismCertificate);

      await api.request(`/super-admin/tenants/${editData.id}`, {
        method: 'PUT',
        body: formData
      });
      setIsEditModalOpen(false);
      triggerAlert('Tenant updated successfully.');
      loadData();
    } catch (err: any) {
      triggerAlert('Failed to update: ' + err.message);
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

      {/* Premium Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-premium-cards border-r border-premium-border transform transition-all duration-300 ease-in-out flex flex-col shrink-0 ${mobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${!mobileMenuOpen && isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>

        {/* Brand */}
        <div className={`h-24 flex items-center border-b border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
          <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            {user?.tenantLogo ? (
              <img src={user.tenantLogo} alt={user?.tenantName || 'Logo'} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[40px]' : 'max-w-[150px]'}`} />
            ) : (
              <>
                <img src="/logo-light.png" alt="RAGCP Logo" className={`dark:hidden object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
                <img src="/logo-dark.png" alt="RAGCP Logo" className={`hidden dark:block object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`} />
              </>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-white/5 text-premium-text/50 hover:text-premium-text transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/5 text-premium-text/50 hover:text-premium-text transition-colors"
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
                  ? 'bg-premium-primary/10 text-premium-primary font-semibold'
                  : 'text-premium-text/70 hover:bg-premium-bg hover:text-premium-text'
                  } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-5 h-5 transition-colors shrink-0 ${isActive ? 'text-premium-primary' : 'text-premium-text/50 group-hover:text-premium-text/80'}`} />
                {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
                {!isSidebarCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-premium-primary shadow-[0_0_8px_var(--tw-colors-premium-primary)]" />
                )}
              </button>
            )
          })}
        </div>

        {/* User Footer */}
        <div className={`p-4 border-t border-premium-border relative overflow-hidden flex flex-col ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-premium-primary/10 to-transparent pointer-events-none" />
          <div
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`bg-premium-bg/80 backdrop-blur-md rounded-2xl flex items-center gap-3 border border-premium-border/50 hover:border-premium-primary/50 transition-all duration-300 group relative overflow-hidden cursor-pointer ${isSidebarCollapsed ? 'p-2 justify-center flex-col' : 'p-4'}`}>
            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_infinite]" />

            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-ping opacity-75" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-[0_0_10px_var(--tw-colors-rose-500)] relative z-10">
                S
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-premium-success border-2 border-premium-bg rounded-full z-20" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 relative z-10">
                <p className="font-bold text-sm truncate text-premium-text">Super Admin</p>
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
          <div className={`flex-1 mt-4 border-t border-slate-200/20 ${isSidebarCollapsed ? 'p-2' : 'pt-4'}`}>
            <button onClick={() => setIsLogoutModalOpen(true)} className={`w-full flex items-center hover:bg-premium-danger/10 rounded-xl text-premium-text/60 hover:text-premium-danger transition-all group ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between p-3'}`} title={isSidebarCollapsed ? "Sign Out" : undefined}>
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

        {/* Global Custom Alert Modal */}
        {globalAlert && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`border shadow-2xl rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden ${globalAlert.isError ? 'bg-white dark:bg-slate-900 border-rose-500/30 shadow-rose-500/10' : 'bg-white dark:bg-slate-900 border-indigo-500/30 shadow-indigo-500/10'}`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${globalAlert.isError ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
              <div className="flex items-start gap-4 pl-2">
                <div className={`p-2 rounded-xl mt-0.5 ${globalAlert.isError ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                  {globalAlert.isError ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{globalAlert.isError ? 'Error / Notice' : 'Notification'}</h3>
                  <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{globalAlert.message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setGlobalAlert(null)} className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition ${globalAlert.isError ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SuperAdminDashboardContent), { ssr: false });
