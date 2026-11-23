import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import {
  CreditCard,
  Plus,
  Check,
  X,
  Edit2,
  Power,
  Shield,
  Send,
  Building,
  Calendar,
  AlertTriangle,
  Loader2,
  FileText,
  DollarSign,
  Users,
  Download,
  Zap,
  QrCode,
  CheckCircle,
  Copy,
  Key,
  Landmark,
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  companies: any[];
}

export const INDIAN_STATES = [
  'ANDAMAN AND NICOBAR ISLANDS',
  'ANDHRA PRADESH',
  'ARUNACHAL PRADESH',
  'ASSAM',
  'BIHAR',
  'CHANDIGARH',
  'CHHATTISGARH',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DELHI',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JAMMU AND KASHMIR',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'LADAKH',
  'LAKSHADWEEP',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'MANIPUR',
  'MEGHALAYA',
  'MIZORAM',
  'NAGALAND',
  'ODISHA',
  'PUDUCHERRY',
  'PUNJAB',
  'RAJASTHAN',
  'SIKKIM',
  'TAMIL NADU',
  'TELANGANA',
  'TRIPURA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL'
];

export const PlatformPlansTab: React.FC<Props> = ({ companies }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingConfig, setBillingConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'plans' | 'billingConfig' | 'assignHistory'>('plans');

  // Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    price: 0,
    durationDays: 30,
    maxActiveClients: 50,
    features: '',
    lockPermissionsOnExpiry: {
      lockNewClientAddition: true,
      lockSignalBroadcast: true,
      lockAgreementSigning: true,
      lockReportsGeneration: false,
      lockStaffLogins: false
    }
  });

  // Assign Plan Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState('');
  const [customMaxClients, setCustomMaxClients] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);

  // History state
  const [selectedHistoryCompany, setSelectedHistoryCompany] = useState<string>('');
  const [unifiedSubscriptions, setUnifiedSubscriptions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Gateway test state
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, configRes] = await Promise.all([
        api.getPlatformPlans().catch(() => ({ success: false, data: [] })),
        api.getPlatformBillingConfig().catch(() => ({ success: false, data: null }))
      ]);
      if (plansRes.success) setPlans(plansRes.data || []);
      if (configRes.success) setBillingConfig(configRes.data);
    } catch (e: any) {
      toast.error('Failed to load platform billing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...planForm,
        features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean)
      };

      if (editingPlan) {
        const res = await api.updatePlatformPlan(editingPlan._id || editingPlan.id, payload);
        if (res.success) toast.success('Plan updated successfully.');
      } else {
        const res = await api.createPlatformPlan(payload);
        if (res.success) toast.success('Plan created successfully.');
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error saving plan.');
    }
  };

  // Toggle Plan Status
  const handleTogglePlan = async (planId: string) => {
    try {
      const res = await api.togglePlatformPlan(planId);
      if (res.success) {
        toast.success(res.message);
        setPlans(plans.map(p => (p._id === planId ? { ...p, isActive: !p.isActive } : p)));
      }
    } catch (err: any) {
      toast.error('Failed to toggle plan status.');
    }
  };

  // Download Platform Invoice PDF
  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber?: string) => {
    try {
      await api.downloadPlatformInvoice(invoiceId, invoiceNumber, true);
      toast.success('Invoice downloaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoice PDF.');
    }
  };

  // Individual Section Saving & QR Upload states
  const [savingEntity, setSavingEntity] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [savingBankQr, setSavingBankQr] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Save Billing Entity Configuration
  const handleSaveEntityConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingConfig?.companyName?.trim()) {
      toast.error('Platform Company Name is required.');
      return;
    }
    if (!billingConfig?.state) {
      toast.error('Registered State is required for Place of Supply.');
      return;
    }
    if (!billingConfig?.email?.trim()) {
      toast.error('Official Billing Email is required.');
      return;
    }
    if (!billingConfig?.mobile?.trim()) {
      toast.error('Billing Phone / Support number is required.');
      return;
    }
    if (!billingConfig?.address?.trim()) {
      toast.error('Registered Address is required.');
      return;
    }

    setSavingEntity(true);
    try {
      const res = await api.updatePlatformBillingConfig(billingConfig);
      if (res.success) {
        toast.success('Billing Entity & Invoicing configuration saved successfully.');
      } else {
        toast.error(res.message || 'Failed to save billing configuration.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save billing configuration.');
    } finally {
      setSavingEntity(false);
    }
  };

  // Save Online Gateway Configuration with Strict Validation
  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (billingConfig?.enableGatewayPayment) {
      if (!billingConfig?.razorpayKeyId?.trim() || !billingConfig?.razorpayKeySecret?.trim()) {
        toast.error('Validation Error: Please enter both Razorpay Key ID and Key Secret before enabling Gateway.');
        return;
      }
    }

    setSavingGateway(true);
    try {
      const res = await api.updatePlatformBillingConfig(billingConfig);
      if (res.success) {
        toast.success('Gateway payment configuration saved successfully.');
      } else {
        toast.error(res.message || 'Failed to save gateway configuration.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save gateway configuration.');
    } finally {
      setSavingGateway(false);
    }
  };

  // Save Bank & QR Configuration with Strict Validation
  const handleSaveBankQrConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    if (billingConfig?.enableBankQrPayment) {
      const hasBank = Boolean(billingConfig?.bankAccountNumber?.trim() && billingConfig?.bankIfsc?.trim());
      const hasUpi = Boolean(billingConfig?.upiId?.trim());
      const hasQr = Boolean(billingConfig?.qrCodeUrl?.trim());

      if (!hasBank && !hasUpi && !hasQr) {
        toast.error('Validation Error: Please fill in Bank details, UPI ID, or upload a QR code before enabling Bank/QR payment.');
        return;
      }

      if (billingConfig?.bankAccountNumber?.trim() && !billingConfig?.bankIfsc?.trim()) {
        toast.error('Validation Error: IFSC code is required when Bank Account Number is provided.');
        return;
      }
    }

    setSavingBankQr(true);
    try {
      const res = await api.updatePlatformBillingConfig(billingConfig);
      if (res.success) {
        toast.success('Bank Account & UPI QR configuration saved successfully.');
      } else {
        toast.error(res.message || 'Failed to save bank/QR configuration.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bank/QR configuration.');
    } finally {
      setSavingBankQr(false);
    }
  };

  // Handle QR Code Image Upload
  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setUploadingQr(true);
    try {
      const res = await api.uploadPlatformQrCode(file);
      if (res.success && res.data?.url) {
        setBillingConfig((prev: any) => ({ ...prev, qrCodeUrl: res.data.url }));
        toast.success('UPI QR Code uploaded successfully!');
      } else {
        toast.error(res.message || 'Failed to upload QR code.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading QR code.');
    } finally {
      setUploadingQr(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  // Assign Plan to Company
  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !selectedPlanId) {
      toast.error('Please select both a company and a plan.');
      return;
    }
    setAssignLoading(true);
    try {
      const res = await api.assignPlatformPlanToCompany(selectedCompanyId, {
        planId: selectedPlanId,
        customStartDate,
        customEndDate: customEndDate || undefined,
        customMaxActiveClients: customMaxClients ? Number(customMaxClients) : undefined,
        customPrice: customPrice !== '' ? Number(customPrice) : undefined,
        remarks: assignRemarks,
        sendInvoiceEmail
      });

      if (res.success) {
        toast.success(res.message || 'Plan successfully assigned to company.');
        setIsAssignModalOpen(false);
        setSelectedCompanyId('');
        setSelectedPlanId('');
      } else {
        toast.error(res.message || 'Failed to assign plan.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error assigning plan.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Load Unified History for Company (or all companies)
  const loadUnifiedHistory = async (compId?: string) => {
    setHistoryLoading(true);
    try {
      const res = await api.getUnifiedPlatformSubscriptions(compId || undefined);
      if (res.success) {
        setUnifiedSubscriptions(res.data || []);
      }
    } catch {
      toast.error('Failed to load subscriptions & invoices.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'assignHistory') {
      loadUnifiedHistory(selectedHistoryCompany);
    }
  }, [subTab, selectedHistoryCompany]);

  // Test Razorpay Gateway Credentials
  const handleTestGateway = async () => {
    if (!billingConfig?.razorpayKeyId || !billingConfig?.razorpayKeySecret) {
      toast.error('Please enter both Razorpay Key ID and Key Secret before testing.');
      return;
    }
    setTestingGateway(true);
    setGatewayTestResult(null);
    try {
      const res = await api.testPlatformGateway({
        razorpayKeyId: billingConfig.razorpayKeyId,
        razorpayKeySecret: billingConfig.razorpayKeySecret
      });
      setGatewayTestResult({ success: res.success, message: res.message });
      if (res.success) {
        toast.success(res.message || 'Razorpay Gateway credentials verified successfully!');
      } else {
        toast.error(res.message || 'Failed to authenticate with Razorpay.');
      }
    } catch (err: any) {
      setGatewayTestResult({ success: false, message: err.message || 'Gateway connection error.' });
      toast.error(err.message || 'Gateway connection test failed.');
    } finally {
      setTestingGateway(false);
    }
  };

  // Approve Offline Subscription
  const handleApproveOffline = async (subId: string) => {
    if (!window.confirm('Are you sure you want to approve this offline payment and activate the subscription? An invoice will be generated and emailed.')) {
      return;
    }
    setApprovingId(subId);
    try {
      const res = await api.approveOfflineSubscription(subId);
      if (res.success) {
        toast.success(res.message || 'Subscription approved and activated successfully.');
        loadUnifiedHistory(selectedHistoryCompany);
      } else {
        toast.error(res.message || 'Failed to approve subscription.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve subscription.');
    } finally {
      setApprovingId(null);
    }
  };

  // Resend Invoice
  const handleResendInvoice = async (invId: string) => {
    try {
      const res = await api.resendPlatformInvoiceEmail(invId);
      if (res.success) toast.success(res.message);
    } catch (e: any) {
      toast.error(e.message || 'Failed to resend invoice.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary-500" />
            SaaS Plans & Platform Billing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure platform subscription tiers, manage invoice GST calculations, and assign plans to RA companies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({
                name: '',
                code: '',
                description: '',
                price: 0,
                durationDays: 30,
                maxActiveClients: 50,
                features: '',
                lockPermissionsOnExpiry: {
                  lockNewClientAddition: true,
                  lockSignalBroadcast: true,
                  lockAgreementSigning: true,
                  lockReportsGeneration: false,
                  lockStaffLogins: false
                }
              });
              setIsPlanModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Create SaaS Plan
          </button>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md transition"
          >
            <Building className="w-4 h-4" /> Assign Plan to Company
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6 text-sm">
        <button
          onClick={() => setSubTab('plans')}
          className={`pb-3 font-semibold transition border-b-2 ${
            subTab === 'plans'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Subscription Plans ({plans.length})
        </button>

        <button
          onClick={() => setSubTab('billingConfig')}
          className={`pb-3 font-semibold transition border-b-2 ${
            subTab === 'billingConfig'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Invoice & GST Configuration
        </button>

        <button
          onClick={() => setSubTab('assignHistory')}
          className={`pb-3 font-semibold transition border-b-2 ${
            subTab === 'assignHistory'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Company Subscriptions & Invoices
        </button>
      </div>

      {/* SUBTAB 1: PLANS GRID */}
      {subTab === 'plans' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
              <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white">No Platform Plans Configured</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create your first platform subscription plan (e.g. Free Trial ₹0, Starter, Pro, Enterprise) to govern RA companies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p: any) => (
                <div
                  key={p._id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                    p.isActive ? 'border-slate-200 dark:border-white/10' : 'border-rose-500/20 opacity-70'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {p.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingPlan(p);
                            setPlanForm({
                              name: p.name,
                              code: p.code,
                              description: p.description || '',
                              price: p.price,
                              durationDays: p.durationDays,
                              maxActiveClients: p.maxActiveClients,
                              features: (p.features || []).join('\n'),
                              lockPermissionsOnExpiry: p.lockPermissionsOnExpiry || {
                                lockNewClientAddition: true,
                                lockSignalBroadcast: true,
                                lockAgreementSigning: true,
                                lockReportsGeneration: false,
                                lockStaffLogins: false
                              }
                            });
                            setIsPlanModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePlan(p._id)}
                          className={`p-1.5 rounded-lg transition ${
                            p.isActive
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-rose-500 hover:bg-rose-500/10'
                          }`}
                          title={p.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {p.description || 'Enterprise advisory platform license'}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 py-1">
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {p.price === 0 ? 'FREE' : `₹${p.price.toLocaleString('en-IN')}`}
                      </span>
                      <span className="text-xs text-slate-500">/ {p.durationDays} Days</span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-primary-500" />
                        <span>Capacity: <strong>{p.maxActiveClients === 0 ? 'Unlimited' : `${p.maxActiveClients} Active Clients`}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          Lockdown: {p.lockPermissionsOnExpiry?.lockSignalBroadcast ? 'Signals Locked' : 'No Signal Lock'}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(p.features) && p.features.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px]">
                        {p.features.map((feat: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className={`font-semibold ${p.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {p.isActive ? '● Active' : '○ Deactivated'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPlanId(p._id);
                        setIsAssignModalOpen(true);
                      }}
                      className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
                    >
                      Assign to Company →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: BILLING & INVOICE CONFIG */}
      {subTab === 'billingConfig' && billingConfig && (
        <div className="max-w-5xl space-y-6">
          {/* Card 1: Platform Invoicing & Entity Details */}
          <form onSubmit={handleSaveEntityConfig} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary-500" />
                  Platform Billing Entity (Printed on Invoices to RA Companies)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These legal details appear on all platform GST tax invoices issued to subscribing RA firms.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Platform Company Name *</label>
                <input
                  type="text"
                  required
                  value={billingConfig.companyName || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registered State (for GST POS) *</label>
                <select
                  required
                  value={billingConfig.state || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-semibold focus:border-primary-500 outline-none"
                >
                  <option value="">-- Select Registered State --</option>
                  {INDIAN_STATES.map(st => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Platform GSTIN</label>
                <input
                  type="text"
                  placeholder="15-character GSTIN"
                  value={billingConfig.gstin || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GST Calculation Mode</label>
                <select
                  value={billingConfig.gstCalculationType || 'EXCLUSIVE'}
                  onChange={e => setBillingConfig({ ...billingConfig, gstCalculationType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                >
                  <option value="EXCLUSIVE">EXCLUSIVE (Price + 18% GST)</option>
                  <option value="INCLUSIVE">INCLUSIVE (18% GST included in price)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Official Billing Email *</label>
                <input
                  type="email"
                  required
                  value={billingConfig.email || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Phone / Support *</label>
                <input
                  type="text"
                  required
                  value={billingConfig.mobile || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registered Address *</label>
                <textarea
                  rows={2}
                  required
                  value={billingConfig.address || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={billingConfig.invoicePrefix || 'PLAT-INV-'}
                  onChange={e => setBillingConfig({ ...billingConfig, invoicePrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Next Sequence #</label>
                <input
                  type="number"
                  value={billingConfig.nextInvoiceSequence || 1001}
                  onChange={e => setBillingConfig({ ...billingConfig, nextInvoiceSequence: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="submit"
                disabled={savingEntity}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-500/20 transition flex items-center gap-2"
              >
                {savingEntity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingEntity ? 'Saving Entity...' : 'Save Billing Entity'}
              </button>
            </div>
          </form>

          {/* Card 2: Online Payment Gateway (Razorpay) Settings */}
          <form onSubmit={handleSaveGatewayConfig} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Online Payment Gateway (Razorpay)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows RA Companies to pay directly via Cards, Netbanking, UPI, and Wallets for instant automated activation.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingConfig.enableGatewayPayment || false}
                  onChange={e => setBillingConfig({ ...billingConfig, enableGatewayPayment: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-900 dark:text-white">
                  {billingConfig.enableGatewayPayment ? 'Gateway Enabled' : 'Gateway Disabled'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razorpay Key ID</label>
                <input
                  type="text"
                  placeholder="rzp_live_... or rzp_test_..."
                  value={billingConfig.razorpayKeyId || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, razorpayKeyId: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razorpay Key Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Enter Razorpay Secret Key"
                    value={billingConfig.razorpayKeySecret || ''}
                    onChange={e => setBillingConfig({ ...billingConfig, razorpayKeySecret: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Connection Button & Result Alert */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="text-[11px] text-slate-500">
                You can test the credentials to ensure the Razorpay API connection is operational before saving.
              </div>
              <button
                type="button"
                onClick={handleTestGateway}
                disabled={testingGateway}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-2 shrink-0"
              >
                {testingGateway ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                {testingGateway ? 'Testing Connection...' : 'Test Gateway Credentials'}
              </button>
            </div>

            {gatewayTestResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  gatewayTestResult.success
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {gatewayTestResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{gatewayTestResult.message}</span>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="submit"
                disabled={savingGateway}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-500/20 transition flex items-center gap-2"
              >
                {savingGateway ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingGateway ? 'Saving Gateway...' : 'Save Gateway Settings'}
              </button>
            </div>
          </form>

          {/* Card 3: Bank Transfer & UPI QR Code Settings */}
          <form onSubmit={handleSaveBankQrConfig} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  Bank Account & UPI QR Code Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allows RA Companies to transfer directly to your bank account or scan UPI QR and submit reference UTR for SuperAdmin approval.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingConfig.enableBankQrPayment || false}
                  onChange={e => setBillingConfig({ ...billingConfig, enableBankQrPayment: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-xs font-bold text-slate-900 dark:text-white">
                  {billingConfig.enableBankQrPayment ? 'Bank/QR Enabled' : 'Bank/QR Disabled'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  value={billingConfig.bankName || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Platform Technologies Private Limited"
                  value={billingConfig.bankAccountName || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, bankAccountName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50200012345678"
                  value={billingConfig.bankAccountNumber || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, bankAccountNumber: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={billingConfig.bankIfsc || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, bankIfsc: e.target.value.toUpperCase().trim() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UPI VPA ID</label>
                <input
                  type="text"
                  placeholder="e.g. platform@icici"
                  value={billingConfig.upiId || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, upiId: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">UPI Payee Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Platform Billing"
                  value={billingConfig.upiPayeeName || ''}
                  onChange={e => setBillingConfig({ ...billingConfig, upiPayeeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              {/* QR CODE UPLOAD & PREVIEW SECTION */}
              <div className="md:col-span-2 pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  UPI QR Code Image (Upload File Directly)
                </label>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={qrFileInputRef}
                  onChange={handleQrFileUpload}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl">
                  {billingConfig.qrCodeUrl ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="shrink-0 p-1.5 border border-slate-200 dark:border-white/10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                        <img
                          src={billingConfig.qrCodeUrl}
                          alt="QR Code Preview"
                          className="w-24 h-24 object-contain rounded-lg"
                          onError={(e: any) => { e.target.style.display = 'none'; }}
                        />
                      </div>

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            QR Image Uploaded
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 truncate block">
                            {billingConfig.qrCodeUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => qrFileInputRef.current?.click()}
                            disabled={uploadingQr}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
                          >
                            {uploadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            Change QR Image
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingConfig({ ...billingConfig, qrCodeUrl: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 transition flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => qrFileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-slate-300 dark:border-white/15 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-500/5 transition flex flex-col items-center justify-center space-y-2"
                    >
                      {uploadingQr ? (
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {uploadingQr ? 'Uploading QR Code Image...' : 'Click to Upload Official UPI QR Code'}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        PNG, JPG, or WEBP up to 5MB. Will be displayed to RA companies for scanning.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Or Enter External QR Code URL (Optional fallback)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/qr.png or /uploads/branding/..."
                    value={billingConfig.qrCodeUrl || ''}
                    onChange={e => setBillingConfig({ ...billingConfig, qrCodeUrl: e.target.value.trim() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5">
              <button
                type="submit"
                disabled={savingBankQr}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
              >
                {savingBankQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingBankQr ? 'Saving Bank & QR...' : 'Save Bank & QR Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 3: UNIFIED COMPANY SUBSCRIPTIONS & INVOICES TABLE */}
      {subTab === 'assignHistory' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="w-full sm:w-96">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Filter by RA Company
              </label>
              <select
                value={selectedHistoryCompany}
                onChange={e => setSelectedHistoryCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-medium"
              >
                <option value="">-- All RA Companies (Complete History) --</option>
                {companies.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.companyName} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadUnifiedHistory(selectedHistoryCompany)}
                disabled={historyLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* SINGLE COMPLETE UNIFIED TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  Unified Platform Subscriptions & Tax Invoices
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Complete ledger of company licenses, payments, GST invoices, and offline approval requests.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                {unifiedSubscriptions.length} Records
              </span>
            </div>

            {historyLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
                <p className="text-xs text-slate-500 mt-2">Loading platform subscriptions and invoices...</p>
              </div>
            ) : unifiedSubscriptions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium">No subscription or invoice records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-500 border-b border-slate-200 dark:border-white/5 uppercase bg-slate-50/50 dark:bg-slate-800/30">
                    <tr>
                      <th className="py-3 px-3">Company & State</th>
                      <th className="py-3 px-2">Plan Details</th>
                      <th className="py-3 px-2">Validity Period</th>
                      <th className="py-3 px-2">Capacity</th>
                      <th className="py-3 px-2">Base + GST</th>
                      <th className="py-3 px-2">Total Amount</th>
                      <th className="py-3 px-2">Payment Mode</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Invoice #</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {unifiedSubscriptions.map((s: any) => {
                      const comp = s.companyId;
                      const inv = s.invoiceId;
                      const isPendingApproval = s.status === 'PENDING_APPROVAL';

                      return (
                        <tr key={s._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          {/* Company & State */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {comp?.companyName || 'Unknown Company'}
                            </div>
                            <div className="text-[10px] text-slate-500">{comp?.email || 'N/A'}</div>
                            {comp?.state && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                {comp.state}
                              </span>
                            )}
                          </td>

                          {/* Plan Details */}
                          <td className="py-3 px-2">
                            <span className="font-bold text-slate-900 dark:text-white">{s.planName}</span>
                            {s.planId?.code && (
                              <div className="text-[10px] font-mono text-primary-600 dark:text-primary-400">
                                {s.planId.code}
                              </div>
                            )}
                          </td>

                          {/* Validity Period */}
                          <td className="py-3 px-2 font-mono text-[11px]">
                            <div>{new Date(s.startDate).toLocaleDateString('en-IN')}</div>
                            <div className="text-slate-400 text-[10px]">to {new Date(s.endDate).toLocaleDateString('en-IN')}</div>
                          </td>

                          {/* Capacity */}
                          <td className="py-3 px-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {s.maxActiveClients === 0 ? 'Unlimited' : `${s.maxActiveClients} Clients`}
                            </span>
                          </td>

                          {/* Base + GST */}
                          <td className="py-3 px-2 font-mono text-[11px]">
                            <div>₹{(s.baseAmount ?? 0).toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-slate-400">
                              + GST ₹{(s.gstAmount ?? 0).toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-2 font-extrabold text-slate-900 dark:text-white text-xs">
                            ₹{(s.totalAmount ?? 0).toLocaleString('en-IN')}
                          </td>

                          {/* Payment Mode */}
                          <td className="py-3 px-2">
                            {s.paymentMode === 'ONLINE_GATEWAY' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Zap className="w-2.5 h-2.5" /> Razorpay
                              </span>
                            ) : s.paymentMode === 'QR_UPI' || s.paymentMode === 'BANK_TRANSFER' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  <Landmark className="w-2.5 h-2.5" /> {s.paymentMode === 'QR_UPI' ? 'UPI QR' : 'Bank'}
                                </span>
                                {s.offlineTransactionRef && (
                                  <div className="text-[9px] font-mono text-slate-500 mt-0.5" title="UTR Reference">
                                    Ref: {s.offlineTransactionRef}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                                Admin Assigned
                              </span>
                            )}
                          </td>

                          {/* Subscription Status */}
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                s.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : s.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse'
                                  : 'bg-slate-100 text-slate-500 dark:bg-white/5'
                              }`}
                            >
                              {s.status === 'PENDING_APPROVAL' ? 'PENDING APPROVAL' : s.status}
                            </span>
                          </td>

                          {/* Invoice # & Status */}
                          <td className="py-3 px-2">
                            {inv ? (
                              <div>
                                <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                                  {inv.invoiceNumber}
                                </span>
                                <div className="text-[9px] text-emerald-600 font-semibold">{inv.paymentStatus || 'PAID'}</div>
                              </div>
                            ) : s.invoiceStatus === 'PENDING_STATE' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600" title="State not provided in Company profile">
                                Missing State
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Approve Button for offline pending payments */}
                              {isPendingApproval && (
                                <button
                                  onClick={() => handleApproveOffline(s._id)}
                                  disabled={approvingId === s._id}
                                  className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 shadow-sm"
                                  title="Approve offline payment and generate invoice"
                                >
                                  {approvingId === s._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  Approve
                                </button>
                              )}

                              {/* Download Invoice PDF */}
                              {inv && (
                                <>
                                  <button
                                    onClick={() => handleDownloadInvoice(inv._id, inv.invoiceNumber)}
                                    className="px-2.5 py-1 rounded text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 text-primary-600 dark:text-primary-400 inline-flex items-center gap-1 transition border border-primary-500/20"
                                    title="Download official PDF invoice"
                                  >
                                    <Download className="w-3 h-3" /> PDF
                                  </button>
                                  <button
                                    onClick={() => handleResendInvoice(inv._id)}
                                    className="px-2.5 py-1 rounded text-[10px] font-bold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 transition"
                                    title="Resend invoice email"
                                  >
                                    <Send className="w-3 h-3" /> Resend
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAN CREATION / EDIT MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingPlan ? 'Edit Platform Plan' : 'Create New Platform Plan'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Free Starter Trial"
                    value={planForm.name}
                    onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FREE_TRIAL"
                    value={planForm.code}
                    onChange={e => setPlanForm({ ...planForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.price}
                    onChange={e => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                  <span className="text-[10px] text-slate-400">0 for Free/Trial</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planForm.durationDays}
                    onChange={e => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Active Client Cap *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planForm.maxActiveClients}
                    onChange={e => setPlanForm({ ...planForm, maxActiveClients: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                  <span className="text-[10px] text-slate-400">0 for Unlimited</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Overview)</label>
                <textarea
                  rows={2}
                  placeholder="Short summary of this license tier"
                  value={planForm.description}
                  onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl resize-none text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Plan Features (Points-wise / Bullet Points)</label>
                  <span className="text-[10px] text-slate-400">One feature per line</span>
                </div>
                <textarea
                  rows={4}
                  placeholder={`Automated SEBI Audits & Compliance\nAdvisory Signal Broadcast Engine\nClient Vault & Agreement Storage\nFull Digital KYC & Video IPV Gateway`}
                  value={planForm.features}
                  onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Expiry Lockdown Settings */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  Lockdown Rules (When Plan Expires)
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={planForm.lockPermissionsOnExpiry.lockNewClientAddition}
                      onChange={e =>
                        setPlanForm({
                          ...planForm,
                          lockPermissionsOnExpiry: {
                            ...planForm.lockPermissionsOnExpiry,
                            lockNewClientAddition: e.target.checked
                          }
                        })
                      }
                    />
                    <span>Lock adding new clients after plan expiry</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={planForm.lockPermissionsOnExpiry.lockSignalBroadcast}
                      onChange={e =>
                        setPlanForm({
                          ...planForm,
                          lockPermissionsOnExpiry: {
                            ...planForm.lockPermissionsOnExpiry,
                            lockSignalBroadcast: e.target.checked
                          }
                        })
                      }
                    />
                    <span>Lock research signals & recommendations broadcast</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={planForm.lockPermissionsOnExpiry.lockAgreementSigning}
                      onChange={e =>
                        setPlanForm({
                          ...planForm,
                          lockPermissionsOnExpiry: {
                            ...planForm.lockPermissionsOnExpiry,
                            lockAgreementSigning: e.target.checked
                          }
                        })
                      }
                    />
                    <span>Lock agreement signing & digital onboarding</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-white/10 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN PLAN TO COMPANY MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-violet-500/5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-violet-500" />
                Assign SaaS Plan to Company
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAssignPlan} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select RA Company *</label>
                <select
                  required
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                >
                  <option value="">-- Choose RA Company --</option>
                  {companies.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.companyName} ({c.state ? `State: ${c.state}` : 'State: MISSING'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Platform Plan *</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={e => {
                    setSelectedPlanId(e.target.value);
                    const chosen = plans.find(p => p._id === e.target.value);
                    if (chosen) {
                      setCustomMaxClients(String(chosen.maxActiveClients));
                      setCustomPrice(String(chosen.price));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.filter(p => p.isActive).map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — ₹{p.price.toLocaleString('en-IN')} ({p.durationDays}d, {p.maxActiveClients} clients)
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date & Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Start Date *</label>
                  <input
                    type="date"
                    required
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Can backdate for running companies</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Expiry Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Leave blank for auto-duration</p>
                </div>
              </div>

              {/* Custom Clients & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Active Client Limit</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Defaults to plan limit"
                    value={customMaxClients}
                    onChange={e => setCustomMaxClients(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Defaults to plan price"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Deferred State Notice */}
              {(() => {
                const comp = companies.find(c => (c._id || c.id) === selectedCompanyId);
                const isStateMissing = comp && (!comp.state || comp.state.trim() === '' || comp.state === 'N/A');
                if (isStateMissing) {
                  return (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> State Not Selected for this Company
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Subscription will activate immediately, but <strong>Tax Invoice generation is deferred</strong> until the company or admin selects their State in Profile.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional internal assignment note..."
                  value={assignRemarks}
                  onChange={e => setAssignRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={sendInvoiceEmail}
                  onChange={e => setSendInvoiceEmail(e.target.checked)}
                />
                <span>Email Official Invoice to Company Email (if state available)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-white/10 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {assignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Assign Plan Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformPlansTab;
