import React, { useState, useEffect, useMemo } from 'react';
import DataTable from 'react-data-table-component';

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
      textTransform: 'uppercase' as any,
      letterSpacing: '0.05em',
      color: 'rgb(71, 85, 105)',
      paddingLeft: '16px',
      paddingRight: '16px',
    },
  },
  rows: {
    style: {
      fontSize: '13px',
      fontWeight: '500',
      color: 'rgb(51, 65, 85)',
      backgroundColor: 'transparent',
      minHeight: '52px',
      borderBottomColor: 'rgba(203, 213, 225, 0.4)',
      '&:hover': {
        backgroundColor: 'rgba(248, 250, 252, 0.5)',
      },
    },
  },
  cells: {
    style: {
      paddingLeft: '16px',
      paddingRight: '16px',
    },
  },
};
import { Plus, Search, Calendar, RefreshCcw, Download, ArrowLeft, Bell, Eye, X, FileUp, Clock, Check, ChevronDown, Loader2, UploadCloud, Edit, Upload, FileText, Smartphone, EyeOff } from 'lucide-react';
import { PaginatedList } from './ui/PaginatedList';
import api from '../services/api';

import MobilePreview from './MobilePreview';
import ReportPreviewModal from './ReportPreviewModal';
import toast from 'react-hot-toast';

export default function SignalManagement({
  adminPlans,
  user,
  hasPermission,
  showMobilePreview = false
}: {
  adminPlans: any[];
  user?: any;
  hasPermission?: (permCode: string) => boolean;
  showMobilePreview?: boolean;
}) {
  const [view, setView] = useState<'TABLE' | 'CARD' | 'STRATEGY' | 'ADD'>('TABLE');
  const [signalStatusFilter, setSignalStatusFilter] = useState<'OPEN' | 'CLOSED'>('OPEN');

  const isViewOnly = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
    ? true
    : hasPermission
      ? (hasPermission('VIEW_RESEARCH') && !hasPermission('ADD_RESEARCH') && !hasPermission('OWN_RESEARCH'))
      : (user?.permissions?.includes('VIEW_RESEARCH') && !user?.permissions?.includes('ADD_RESEARCH') && !user?.permissions?.includes('OWN_RESEARCH'));
  const [signals, setSignals] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [localPlans, setLocalPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [viewSignalDetails, setViewSignalDetails] = useState<any>(null);

  // Add Signal Form
  const [segment, setSegment] = useState('');
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [callType, setCallType] = useState('');
  const [tradeDuration, setTradeDuration] = useState('');
  const [stockId, setStockId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [optionType, setOptionType] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [entryType, setEntryType] = useState('');
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [target3, setTarget3] = useState('');
  const [stoploss, setStoploss] = useState('');
  const [description, setDescription] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<any>({});

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tncChecked, setTncChecked] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Stock search inside dropdown
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);

  // Close Signal Modal State
  const [closeSignalModal, setCloseSignalModal] = useState<any>(null);
  const [closeStatus, setCloseStatus] = useState('Fully Closed');
  const [closeExitPrice, setCloseExitPrice] = useState('');
  const [closeRemark, setCloseRemark] = useState('');
  const [closeTargets, setCloseTargets] = useState({ t1: false, t2: false, t3: false, close: false });
  const [avoidRemarkModal, setAvoidRemarkModal] = useState<string | null>(null);

  // Report Preview State
  const [reportPreviewModal, setReportPreviewModal] = useState<any>(null);
  const [reportOptionsModal, setReportOptionsModal] = useState<any>(null);
  const [uploadingReportFor, setUploadingReportFor] = useState<any>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTrade, setAlertTrade] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [isMobileVisible, setIsMobileVisible] = useState(false);

  // Smart download helper — checks if file exists before downloading
  const BASE_URL = ((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend' : 'http://localhost:5000');
  const handleSafeDownload = async (reportUrl: string) => {
    const downloadPath = `${BASE_URL}/api/v1/download?path=${encodeURIComponent(reportUrl)}`;
    try {
      const res = await fetch(downloadPath, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || ''
        }
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('application/json')) {
        // Server returned JSON error (e.g. {success:false, message:"File not found"})
        let msg = 'File not found on server.';
        try { const json = await res.json(); msg = json.message || msg; } catch {}
        toast.error('❌ ' + msg);
        return;
      }
      // File exists — trigger download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportUrl.split('/').pop() || 'report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('❌ Download failed: ' + (err.message || 'Network error'));
    }
  };

  const [uploadingCoSignature, setUploadingCoSignature] = useState<boolean>(false);
  const handleUploadCoSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingCoSignature(true);
    try {
      const formData = new FormData();
      formData.append('coSignature', file);
      const res = await fetch(((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend/api/v1' : ((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend' : 'http://localhost:5000') + '/api/v1') + '/admin/signature', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || ''
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        import('react-hot-toast').then(m => m.default.success('Signature uploaded successfully'));
      } else {
        import('react-hot-toast').then(m => m.default.error(data.message || 'Failed to upload signature'));
      }
    } catch (err: any) {
      import('react-hot-toast').then(m => m.default.error(err.message));
    } finally {
      setUploadingCoSignature(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    api.getAdminPlans().then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setLocalPlans(res.data);
      }
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (stockSearchQuery.length >= 2 || view === 'ADD') {
      const delay = setTimeout(() => {
        fetchStocks(stockSearchQuery);
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [stockSearchQuery, view]);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const res = await api.getSignals();
      if (res.success) {
        setSignals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async (query: string) => {
    try {
      const res = await api.getStocks(query);
      if (res.success) {
        setStocks(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time Validation
  useEffect(() => {
    if (view !== 'ADD') return;

    const newErrors: any = {};
    if (segment === '') { } // don't show required initially unless touched, but to keep it simple, we only show errors if they are invalid logically or if they want immediate feedback.

    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stoploss);
    const t1 = parseFloat(target1);
    const t2 = target2 ? parseFloat(target2) : null;
    const t3 = target3 ? parseFloat(target3) : null;

    if (callType === 'BUY') {
      if (ep && sl && sl >= ep) newErrors.stoploss = "For BUY, Stoploss must be less than Entry Price.";
      if (ep && t1 && t1 <= ep) newErrors.target1 = "For BUY, Target 1 must be greater than Entry Price.";
      if (t1 && t2 !== null && t2 <= t1) newErrors.target2 = "For BUY, Target 2 must be greater than Target 1.";
      if (t1 && t3 !== null && t3 <= (t2 !== null ? t2 : t1)) newErrors.target3 = "For BUY, Target 3 must be greater than the previous target.";
    } else if (callType === 'SELL') {
      if (ep && sl && sl <= ep) newErrors.stoploss = "For SELL, Stoploss must be greater than Entry Price.";
      if (ep && t1 && t1 >= ep) newErrors.target1 = "For SELL, Target 1 must be less than Entry Price.";
      if (t1 && t2 !== null && t2 >= t1) newErrors.target2 = "For SELL, Target 2 must be less than Target 1.";
      if (t1 && t3 !== null && t3 >= (t2 !== null ? t2 : t1)) newErrors.target3 = "For SELL, Target 3 must be less than the previous target.";
    }

    setErrors((prev: any) => {
      // keep the required errors if they exist, update the logical errors
      const updated = { ...prev };
      delete updated.stoploss;
      delete updated.target1;
      delete updated.target2;
      delete updated.target3;

      if (newErrors.stoploss) updated.stoploss = newErrors.stoploss;
      if (newErrors.target1) updated.target1 = newErrors.target1;
      if (newErrors.target2) updated.target2 = newErrors.target2;
      if (newErrors.target3) updated.target3 = newErrors.target3;

      return updated;
    });

  }, [callType, entryPrice, stoploss, target1, target2, target3, view]);

  const handleUploadReportFile = async (e: React.ChangeEvent<HTMLInputElement>, signal: any) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setUploadingReportFor(signal.id);
    try {
      const formData = new FormData();
      formData.append('report', file);
      const res = await fetch(`${((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend/api/v1' : ((process.env.NODE_ENV as string) === 'production' ? 'https://compliance.pnpuniverse.in/backend' : 'http://localhost:5000') + '/api/v1')}/signals/${signal.id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || ''
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Report uploaded successfully');
        fetchSignals();
        setReportOptionsModal(null);
      } else {
        toast.error(data.message || 'Failed to upload report');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingReportFor(null);
      e.target.value = '';
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim() || !alertTrade) return;
    setSendingAlert(true);
    try {
      const res = await api.request(`/signals/${alertTrade.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: alertMessage })
      });
      if (res.success) {
        toast.success('Alert sent successfully!');
        setShowAlertModal(false);
        setAlertMessage('');
        setAlertTrade(null);
        fetchSignals();
      } else {
        toast(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to send alert: ' + err.message);
    } finally {
      setSendingAlert(false);
    }
  };

  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};
    if (!segment) newErrors.segment = "Please Select a Segment";
    if (!stockId) newErrors.stockId = "Please Select a Stock";
    if (planIds.length === 0) newErrors.planId = "Please Select at least one Plan";
    if (!callType) newErrors.callType = "Please Select a Call Type";
    if (!tradeDuration) newErrors.tradeDuration = "Please Select Trade Duration";
    if (!entryPrice) newErrors.entryPrice = "Please Select a Price";
    if (!entryType) newErrors.entryType = "Please Select Entry Type";
    if (!target1) newErrors.target1 = "Please Enter Target1";
    if (!stoploss) newErrors.stoploss = "Please Enter Stoploss";
    if (!description) newErrors.description = "Please Enter Description";

    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stoploss);
    const t1 = parseFloat(target1);
    const t2 = target2 ? parseFloat(target2) : null;
    const t3 = target3 ? parseFloat(target3) : null;

    if (callType === 'BUY') {
      if (ep && sl && sl >= ep) newErrors.stoploss = "For BUY, Stoploss must be less than Entry Price.";
      if (ep && t1 && t1 <= ep) newErrors.target1 = "For BUY, Target 1 must be greater than Entry Price.";
      if (t1 && t2 !== null && t2 <= t1) newErrors.target2 = "For BUY, Target 2 must be greater than Target 1.";
      if (t1 && t3 !== null && t3 <= (t2 !== null ? t2 : t1)) newErrors.target3 = "For BUY, Target 3 must be greater than the previous target.";
    } else if (callType === 'SELL') {
      if (ep && sl && sl <= ep) newErrors.stoploss = "For SELL, Stoploss must be greater than Entry Price.";
      if (ep && t1 && t1 >= ep) newErrors.target1 = "For SELL, Target 1 must be less than Entry Price.";
      if (t1 && t2 !== null && t2 >= t1) newErrors.target2 = "For SELL, Target 2 must be less than Target 1.";
      if (t1 && t3 !== null && t3 >= (t2 !== null ? t2 : t1)) newErrors.target3 = "For SELL, Target 3 must be less than the previous target.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setTncChecked(false);
    setConsentChecked(false);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!tncChecked || !consentChecked) {
      toast("Please accept both conditions to proceed.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('segment', segment);
    formData.append('planIds', JSON.stringify(planIds));
    formData.append('callType', callType);
    formData.append('tradeDuration', tradeDuration);
    formData.append('stockId', stockId);
    if (expiryDate) formData.append('expiryDate', expiryDate);
    if (strikePrice) formData.append('strikePrice', strikePrice);
    if (optionType) formData.append('optionType', optionType);
    formData.append('entryPrice', entryPrice);
    formData.append('entryType', entryType);
    formData.append('target1', target1);
    if (target2) formData.append('target2', target2);
    if (target3) formData.append('target3', target3);
    formData.append('stoploss', stoploss);
    formData.append('description', description);
    if (reportFile) formData.append('report', reportFile);

    try {
      const res = await api.createSignal(formData);
      if (res.success) {
        setShowConfirmModal(false);
        setView('TABLE');
        fetchSignals();
        // Reset form
        setSegment(''); setPlanIds([]); setCallType(''); setTradeDuration(''); setStockId(''); setExpiryDate(''); setStrikePrice(''); setOptionType('');
        setEntryPrice(''); setEntryType(''); setTarget1(''); setTarget2(''); setTarget3('');
        setStoploss(''); setDescription(''); setReportFile(null); setStockSearchQuery('');
      } else {
        toast(res.message);
      }
    } catch (err: any) {
      toast.error("Failed to add signal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeSignalModal) return;

    setLoading(true);
    try {
      const isFullyClosed = closeStatus === 'Fully Closed';
      const targetArr = [];
      if (closeTargets.t1 || isFullyClosed) targetArr.push('TARGET1');
      if (closeSignalModal.target2 && (closeTargets.t2 || isFullyClosed)) targetArr.push('TARGET2');
      if (closeSignalModal.target3 && (closeTargets.t3 || isFullyClosed)) targetArr.push('TARGET3');

      let finalExitPrice = closeExitPrice;
      if (closeStatus === 'Fully Closed' || closeStatus === 'Partially Closed') {
        if (closeTargets.t3 || (isFullyClosed && closeSignalModal.target3)) finalExitPrice = closeSignalModal.target3;
        else if (closeTargets.t2 || (isFullyClosed && closeSignalModal.target2)) finalExitPrice = closeSignalModal.target2;
        else if (closeTargets.t1 || (isFullyClosed && closeSignalModal.target1)) finalExitPrice = closeSignalModal.target1;
      }

      let isFinalClose = true;
      if (closeStatus === 'Partially Closed' && !closeTargets.close) {
        isFinalClose = false;
      }

      const res = await api.closeSignal(closeSignalModal.id, {
        closeStatus,
        exitPrice: finalExitPrice,
        closeRemark,
        closeTargets: targetArr.join(','),
        isFinalClose
      });

      if (res.success) {
        setCloseSignalModal(null);
        fetchSignals();
        setCloseStatus('Fully Closed');
        setCloseExitPrice('');
        setCloseRemark('');
        setCloseTargets({ t1: false, t2: false, t3: false, close: false });
      } else {
        toast(res.message);
      }
    } catch (err: any) {
      toast.error("Failed to close signal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSignals = signals.filter(s => {
    if (searchQuery && !s.stock?.symbol?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedService && s.planId !== selectedService) return false;
    if (selectedStockId && s.stockId !== selectedStockId) return false;
    if (fromDate && new Date(s.createdAt) < new Date(fromDate)) return false;
    if (toDate && new Date(s.createdAt) > new Date(toDate)) return false;
    if (signalStatusFilter === 'OPEN') {
      return s.status === 'OPEN';
    } else {
      return s.status !== 'OPEN';
    }
  });

  const signalColumns = useMemo(() => {
    const cols: any[] = [
      {
        name: 'S.No',
        width: '70px',
        selector: (row: any, index?: number) => index !== undefined ? index + 1 : 0,
        cell: (row: any, index?: number) => (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
            {index !== undefined ? index + 1 : ''}
          </span>
        ),
      },
      {
        name: 'Segment',
        width: '130px',
        selector: (row: any) => row.segment,
        cell: (row: any) => (
          <div className="flex items-center space-x-2">
            <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md text-xs border border-slate-400 dark:border-white/10 whitespace-nowrap">{row.segment}</span>
            {row.closeStatus === 'Avoid Signal' && (
              <div className="flex items-center space-x-1 whitespace-nowrap">
                <span className="text-red-600 dark:text-red-500 font-bold text-xs">(Avoid)</span>
                <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-500 cursor-pointer hover:text-yellow-600 dark:text-yellow-400" onClick={() => setAvoidRemarkModal(row.closeRemark)} />
              </div>
            )}
          </div>
        ),
      },
      {
        name: 'Symbol',
        minWidth: '150px',
        selector: (row: any) => row.stock?.symbol,
        cell: (row: any) => (
          <span className="font-bold text-slate-900 dark:text-white tracking-wide whitespace-nowrap">
            {row.stock?.symbol}
            {row.strikePrice && <span className="ml-2 text-xs font-semibold text-slate-500">{row.strikePrice} {row.optionType || ''}</span>}
          </span>
        ),
      },
      {
        name: 'Plan',
        minWidth: '140px',
        selector: (row: any) => row.planName,
        cell: (row: any) => <span className="text-slate-700 dark:text-gray-300 whitespace-nowrap">{row.planName}</span>
      },
      {
        name: 'Entry Type',
        width: '100px',
        selector: (row: any) => row.callType,
        cell: (row: any) => (
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${row.callType === 'BUY' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
            {row.callType}
          </span>
        )
      },
      {
        name: 'Entry Price',
        width: '110px',
        selector: (row: any) => row.entryPrice,
        cell: (row: any) => <span className="font-semibold text-lime-700 dark:text-[#d4f23b] whitespace-nowrap">₹ {row.entryPrice}</span>
      }
    ];

    if (signalStatusFilter === 'CLOSED') {
      cols.push({
        name: 'Exit Price',
        width: '110px',
        selector: (row: any) => row.exitPrice,
        cell: (row: any) => <span className="font-semibold text-slate-700 dark:text-gray-300 whitespace-nowrap">{row.exitPrice ? `₹ ${row.exitPrice}` : 'N/A'}</span>
      });
    }

    cols.push({
      name: 'Entry Date',
      minWidth: '160px',
      selector: (row: any) => row.createdAt,
      cell: (row: any) => <span className="text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{new Date(row.createdAt).toLocaleString()}</span>
    });

    if (signalStatusFilter === 'CLOSED') {
      cols.push({
        name: 'Exit Date',
        minWidth: '160px',
        selector: (row: any) => row.closedAt,
        cell: (row: any) => <span className="text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{row.closedAt ? new Date(row.closedAt).toLocaleString() : 'N/A'}</span>
      });
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      cols.push({
        name: 'Researcher',
        minWidth: '140px',
        selector: (row: any) => row.createdByName,
        cell: (row: any) => <span className="whitespace-nowrap text-xs font-semibold text-slate-700 dark:text-slate-300">{row.createdByName || 'Unknown'}</span>
      });
    }

    cols.push({
      name: 'Action',
      width: '180px',
      right: true,
      cell: (row: any) => (
        <div className="flex items-center justify-end space-x-2">
          <button onClick={() => setViewSignalDetails(row)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-300" title="View Details">
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'OPEN' && !isViewOnly && (
            <button onClick={() => { setAlertTrade(row); setShowAlertModal(true); }} className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all duration-300" title="Send Alert">
              <Bell className="w-4 h-4" />
            </button>
          )}
          {row.status === 'OPEN' && !isViewOnly && (
            <button onClick={() => {
              setCloseSignalModal(row);
              setCloseStatus('Fully Closed');
              setCloseExitPrice('');
              setCloseRemark('');
              setCloseTargets({ t1: false, t2: false, t3: false, close: false });
            }} className="p-1.5 bg-red-500/10 hover:bg-red-500/30 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] text-red-600 dark:text-red-400 rounded-lg transition-all duration-300" title="Close Signal">
              <X className="w-4 h-4" />
            </button>
          )}
          {!row.reportUrl && !isViewOnly && (
            <button onClick={() => {
              setReportOptionsModal(row);
            }} className="p-1.5 bg-green-500/10 hover:bg-green-500/30 text-green-600 dark:text-green-400 rounded-lg transition-all duration-300" title="Report Options">
              <FileUp className="w-4 h-4" />
            </button>
          )}
          {row.reportUrl && (
            <>
              <button
                onClick={() => handleSafeDownload(row.reportUrl)}
                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-lg transition-all duration-300 inline-flex"
                title="Download Report"
              >
                <Download className="w-4 h-4" />
              </button>
              {!isViewOnly && (
                <button onClick={() => {
                  setReportOptionsModal(row);
                }} className="p-1.5 ml-1 bg-orange-500/10 hover:bg-orange-500/30 text-orange-600 dark:text-orange-400 rounded-lg transition-all duration-300 inline-flex" title="Edit Report">
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )
    });

    return cols;
  }, [signalStatusFilter, user, isViewOnly]);

  return (
    <div className={`text-slate-900 dark:text-white min-h-screen bg-white dark:bg-[#0f1523] pb-10 ${showMobilePreview ? 'lg:flex' : ''}`}>
      <div className={`flex-1 min-w-0`}>
        {view === 'ADD' && (
        <div className="bg-white dark:bg-[#0B101E]/80 backdrop-blur-lg px-6 py-5 flex items-center justify-between border-b border-slate-300 dark:border-white/5 mb-6 shadow-xl sticky top-0 z-20">
          <h1 className="text-lg font-bold flex items-center space-x-2">
            <ArrowLeft className="h-5 w-5 cursor-pointer hover:text-primary-600 dark:text-primary-400" onClick={() => setView('TABLE')} />
            <span>| Add Signal</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="flex space-x-4">
              <button onClick={() => setView('TABLE')} className="px-4 py-2 bg-transparent border border-[#d4f23b] text-lime-700 dark:text-[#d4f23b] rounded flex items-center space-x-2 font-semibold hover:bg-[#d4f23b] hover:text-black hover:shadow-[0_0_15px_rgba(212,242,59,0.4)] transition-all duration-300">
                <ArrowLeft className="h-4 w-4" /> <span>Back</span>
              </button>
              <button className="px-4 py-2 bg-[#d4f23b] text-black rounded flex items-center space-x-2 font-bold hover:bg-[#c3e031] hover:shadow-[0_0_15px_rgba(212,242,59,0.4)] hover:-translate-y-0.5 transition-all duration-300">
                <Bell className="h-4 w-4" /> <span>Alert</span>
              </button>
            </div>
          </div>
        </div>
      )}

        {view !== 'ADD' && (
          <div className="bg-white dark:bg-[#151c2c]/60 backdrop-blur-md p-6 rounded-2xl border border-slate-300 dark:border-white/5 shadow-2xl mx-6">
            {/* Tabs */}
            <div className="flex flex-col md:flex-row justify-between mb-6 space-y-4 md:space-y-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setSignalStatusFilter('OPEN')}
                  className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 ${signalStatusFilter === 'OPEN' ? 'bg-[#d4f23b] text-black shadow-[0_0_20px_rgba(212,242,59,0.4)]' : 'text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:border-slate-400 dark:border-white/30 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}
                >
                  Open Signals
                </button>
                <button
                  onClick={() => setSignalStatusFilter('CLOSED')}
                  className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 ${signalStatusFilter === 'CLOSED' ? 'bg-[#d4f23b] text-black shadow-[0_0_20px_rgba(212,242,59,0.4)]' : 'text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:border-slate-400 dark:border-white/30 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}
                >
                  Closed Signals
                </button>
              </div>

              {!isViewOnly && (
                <div className="flex space-x-2">
                  <button onClick={() => setView('TABLE')} className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 ${view === 'TABLE' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg' : 'text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10'}`}>Table View</button>
                  <button onClick={() => setView('CARD')} className={`px-6 py-2 rounded-lg font-bold transition-all duration-300 ${view === 'CARD' ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg' : 'text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10'}`}>Card View</button>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              {showMobilePreview && (
              <button
                onClick={() => setIsMobileVisible(prev => !prev)}
                title={isMobileVisible ? 'Hide Phone Preview' : 'Show Phone Preview'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${isMobileVisible
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-slate-900 dark:border-white'
                    : 'text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
              >
                {isMobileVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isMobileVisible ? 'Hide Preview' : 'Show Preview'}</span>
              </button>
            )}
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Search Signal"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-[#1A2235] border border-slate-400 dark:border-white/10 rounded px-10 py-2 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              {!isViewOnly && (
                <div className="flex gap-2 w-full md:w-auto">

                  <button onClick={() => setView('ADD')} className="flex-1 md:flex-none px-4 py-2 bg-[#d4f23b] text-slate-900 font-bold rounded flex items-center justify-center space-x-2 hover:bg-[#c3e031] transition-all duration-300">
                    <Plus className="h-4 w-4" /> <span>Add Signal</span>
                  </button>
                  <button
                    onClick={() => {
                      const exportData = filteredSignals.map(s => ({
                        Publish_Date: new Date(s.createdAt).toLocaleString(),
                        Symbol: s.stock?.symbol || 'N/A',
                        Segment: s.segment,
                        Call_Type: s.callType,
                        Status: s.status,
                        Entry_Price: s.entryPrice,
                        T1: s.target1,
                        T2: s.target2,
                        T3: s.target3,
                        Stoploss: s.stoploss,
                        Plan: s.planName || s.planId
                      }));
                      import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'Signal_Management'));
                    }}
                    className="flex-1 md:flex-none px-4 py-2 bg-transparent border border-[#d4f23b] text-lime-700 dark:text-[#d4f23b] font-bold rounded flex items-center justify-center space-x-2 hover:bg-[#d4f23b] hover:text-black transition-all duration-300"
                  >
                    <Download className="h-4 w-4" /> <span>Export-Excel</span>
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const handleResetFilters = () => {
                setFromDate('');
                setToDate('');
                setSelectedService('');
                setSelectedStockId('');
                setSearchQuery('');
                fetchSignals();
              };
              return (
                <>
                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">From date</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">To Date</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">Select Service</label>
                      <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className="w-full bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 appearance-none">
                        <option value="">All Services</option>
                        {adminPlans.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">Select Stock</label>
                      <div className="flex space-x-2">
                        <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} className="flex-1 bg-slate-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white transition-all shadow-sm focus:ring-2 focus:ring-primary-500/20 appearance-none">
                          <option value="">All Stocks</option>
                          {stocks.map(s => (
                            <option key={s.id} value={s.id}>{s.symbol}</option>
                          ))}
                        </select>
                        <button onClick={handleResetFilters} title="Reset Filters" className="p-2.5 bg-slate-50 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl dark:hover:bg-white/20 transition-all shadow-sm text-slate-600 dark:text-slate-300 flex-shrink-0">
                          <RefreshCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Table */}
            {(view === 'TABLE' || isViewOnly) && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden w-full shadow-xl shadow-slate-200/20 dark:shadow-none bg-white dark:bg-[#0F172A]">
                <div className="overflow-x-auto">
                  <DataTable
                    columns={signalColumns}
                    data={filteredSignals}
                    pagination
                    paginationPerPage={10}
                    highlightOnHover
                    responsive
                    customStyles={tableCustomStyles}
                    noDataComponent={<div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">No signals found matching your criteria.</div>}
                  />
                </div>
              </div>
            )}
            {view === 'CARD' && !isViewOnly && (
              <div className="text-center py-10 text-slate-600 dark:text-gray-400">Card View Coming Soon</div>
            )}
            {view === 'CARD' && !isViewOnly && (
              <div className="text-center py-10 text-slate-600 dark:text-gray-400">Card View Coming Soon</div>
            )}
          </div>
        )}

        {view === 'ADD' && (
          <div className="bg-white dark:bg-[#0f1523] p-6 rounded-lg border border-slate-300 dark:border-white/5 max-w-5xl">
            <form onSubmit={handleOpenConfirmModal}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Segment<span className="text-red-600 dark:text-red-500">*</span></label>
                    <select value={segment} onChange={e => { setSegment(e.target.value); setPlanIds([]); setErrors((prev: any) => ({ ...prev, segment: '' })); }} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]">
                      <option value="">select</option>
                      <option value="CASH">CASH</option>
                      <option value="FUTURE">FUTURE</option>
                      <option value="OPTION">OPTION</option>
                    </select>
                    {errors.segment && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.segment}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Plan<span className="text-red-600 dark:text-red-500">*</span></label>
                    <div className="relative">
                      {!segment ? (
                        <div className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-500 italic">
                          Please select a segment first.
                        </div>
                      ) : (
                        <>
                          <div
                            className="w-full min-h-[46px] bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-2 py-1.5 flex flex-wrap gap-2 items-center cursor-pointer pr-8"
                            onClick={() => setPlanDropdownOpen(!planDropdownOpen)}
                          >
                            {planIds.length === 0 ? (
                              <span className="text-slate-500 text-sm px-1 py-1.5">Select Plans</span>
                            ) : (
                              planIds.map(id => {
                                const availablePlans = (adminPlans && adminPlans.length > 0) ? adminPlans : localPlans;
                                const p = availablePlans.find((ap: any) => (ap.id || ap._id) === id);
                                return p ? (
                                  <span key={id} className="bg-primary-500/10 dark:bg-slate-800 border border-primary-500/30 text-primary-700 dark:text-primary-300 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                    {p.name}
                                    <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPlanIds(planIds.filter(pid => pid !== id)); }} />
                                  </span>
                                ) : null;
                              })
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {planIds.length > 0 && (
                                <X className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPlanIds([]); }} />
                              )}
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            </div>
                          </div>
                          {planDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1A2235] border border-slate-400 dark:border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                              {(() => {
                                const availablePlans = (adminPlans && adminPlans.length > 0) ? adminPlans : localPlans;
                                const filtered = availablePlans.filter((p: any) => {
                                  if (!segment) return true;
                                  const segLower = segment.toLowerCase().trim();
                                  const rSegs = Array.isArray(p.researchSegments)
                                    ? p.researchSegments.map((s: string) => s.toLowerCase().trim())
                                    : typeof p.researchSegments === 'string'
                                      ? p.researchSegments.toLowerCase().split(',').map((s: string) => s.trim())
                                      : [];
                                  const cSegs = Array.isArray(p.category?.segments)
                                    ? p.category.segments.map((s: string) => s.toLowerCase().trim())
                                    : [];
                                  if (rSegs.length === 0 && cSegs.length === 0) return true;
                                  return rSegs.includes(segLower) || cSegs.includes(segLower);
                                });

                                const finalPlans = filtered.length > 0 ? filtered : availablePlans;

                                if (finalPlans.length === 0) {
                                  return <div className="px-4 py-3 text-sm text-slate-500 italic">No plans available</div>;
                                }

                                return finalPlans.map((p: any) => {
                                  const pId = p.id || p._id;
                                  return (
                                    <div
                                      key={pId}
                                      className="px-4 py-3 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-sm transition-colors border-b border-slate-200 dark:border-white/5 last:border-0"
                                      onClick={() => {
                                        if (planIds.includes(pId)) {
                                          setPlanIds(planIds.filter(id => id !== pId));
                                        } else {
                                          setPlanIds([...planIds, pId]);
                                        }
                                        setErrors((prev: any) => ({ ...prev, planId: '' }));
                                      }}
                                    >
                                      <span className={planIds.includes(pId) ? 'font-bold text-lime-700 dark:text-[#d4f23b]' : ''}>{p.name}</span>
                                      {planIds.includes(pId) && <Check className="w-4 h-4 text-lime-700 dark:text-[#d4f23b]" />}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {errors.planId && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.planId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Call Type<span className="text-red-600 dark:text-red-500">*</span></label>
                    <select value={callType} onChange={e => { setCallType(e.target.value); setErrors((prev: any) => ({ ...prev, callType: '' })); }} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]">
                      <option value="">select</option>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                    {errors.callType && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.callType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Trade Duration<span className="text-red-600 dark:text-red-500">*</span></label>
                    <select value={tradeDuration} onChange={e => { setTradeDuration(e.target.value); setErrors((prev: any) => ({ ...prev, tradeDuration: '' })); }} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]">
                      <option value="">select</option>
                      <option value="INTRADAY">Intraday</option>
                      <option value="SHORT_TERM">Short Term</option>
                      <option value="LONG_TERM">Long Term</option>
                    </select>
                    {errors.tradeDuration && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.tradeDuration}</p>}
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Select Stock<span className="text-red-600 dark:text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search stock..."
                        value={stockSearchQuery}
                        onChange={e => {
                          setStockSearchQuery(e.target.value);
                          setStockId(''); // Reset selected if typing
                          setErrors((prev: any) => ({ ...prev, stockId: '' }));
                        }}
                        className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]"
                      />
                      {errors.stockId && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.stockId}</p>}
                      {stockSearchQuery && !stockId && stocks.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-100 dark:bg-[#1A2235] border border-slate-400 dark:border-white/10 rounded shadow-lg max-h-48 overflow-y-auto">
                          {stocks.map(s => (
                            <div
                              key={s.id}
                              className="px-4 py-2 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 cursor-pointer text-sm font-bold"
                              onClick={() => {
                                setStockId(s.id);
                                setStockSearchQuery(s.symbol);
                                setErrors((prev: any) => ({ ...prev, stockId: '' }));
                              }}
                            >
                              {s.symbol} - <span className="font-normal text-xs text-slate-600 dark:text-gray-400">{s.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {(segment === 'FUTURE' || segment === 'OPTION') && (
                    <div className={`grid ${segment === 'OPTION' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                      <div>
                        <label className="block text-sm font-bold mb-1">Expiry Date</label>
                        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Strike Price</label>
                        <input type="number" step="0.01" value={strikePrice} onChange={e => setStrikePrice(e.target.value)} placeholder="e.g. 15000" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                      </div>
                      {segment === 'OPTION' && (
                        <div>
                          <label className="block text-sm font-bold mb-1">Option Type</label>
                          <select value={optionType} onChange={e => setOptionType(e.target.value)} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]">
                            <option value="">select</option>
                            <option value="CE">CE</option>
                            <option value="PE">PE</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold mb-1">Entry Price<span className="text-red-600 dark:text-red-500">*</span></label>
                    <input type="number" step="0.01" value={entryPrice} onChange={e => { setEntryPrice(e.target.value); setErrors((prev: any) => ({ ...prev, entryPrice: '' })); }} placeholder="Enter Entry Price" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                    {errors.entryPrice && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.entryPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Entry Type<span className="text-red-600 dark:text-red-500">*</span></label>
                    <select value={entryType} onChange={e => { setEntryType(e.target.value); setErrors((prev: any) => ({ ...prev, entryType: '' })); }} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]">
                      <option value="">select</option>
                      <option value="EXACT">EXACT</option>
                      <option value="ABOVE">ABOVE</option>
                      <option value="BELOW">BELOW</option>
                      <option value="RANGE">RANGE</option>
                    </select>
                    {errors.entryType && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.entryType}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1">Target-1<span className="text-red-600 dark:text-red-500">*</span></label>
                      <input type="number" step="0.01" value={target1} onChange={e => { setTarget1(e.target.value); setErrors((prev: any) => ({ ...prev, target1: '' })); }} placeholder="Enter Target-1" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                      {errors.target1 && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.target1}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Target-2</label>
                      <input type="number" step="0.01" value={target2} onChange={e => { setTarget2(e.target.value); setErrors((prev: any) => ({ ...prev, target2: '' })); }} placeholder="Enter Target-2" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                      {errors.target2 && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.target2}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1">Target-3</label>
                    <input type="number" step="0.01" value={target3} onChange={e => { setTarget3(e.target.value); setErrors((prev: any) => ({ ...prev, target3: '' })); }} placeholder="Enter Target-3" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                    {errors.target3 && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.target3}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Stoploss<span className="text-red-600 dark:text-red-500">*</span></label>
                    <input type="number" step="0.01" value={stoploss} onChange={e => { setStoploss(e.target.value); setErrors((prev: any) => ({ ...prev, stoploss: '' })); }} placeholder="Enter Stoploss" className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b]" />
                    {errors.stoploss && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.stoploss}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Report</label>
                  <div className="flex border border-slate-400 dark:border-white/10 rounded bg-white dark:bg-[#0B101E]">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                            setReportFile(file);
                          } else {
                            toast('Only PDF files are allowed for the report.');
                            e.target.value = '';
                            setReportFile(null);
                          }
                        }
                      }}
                      className="hidden"
                      id="reportFile"
                    />
                    <label htmlFor="reportFile" className="bg-white text-black px-4 py-3 font-semibold cursor-pointer rounded-l text-sm">
                      Choose File
                    </label>
                    <div className="px-4 py-3 text-sm text-slate-600 dark:text-gray-400">
                      {reportFile ? reportFile.name : "No file chosen"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold mb-1">Description<span className="text-red-600 dark:text-red-500">*</span></label>
                <textarea value={description} onChange={e => { setDescription(e.target.value); setErrors((prev: any) => ({ ...prev, description: '' })); }} placeholder="Enter Description" rows={4} className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#d4f23b] resize-none" />
                {errors.description && <p className="text-red-600 dark:text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4">
                <button type="button" onClick={() => setView('TABLE')} className="px-8 py-2 bg-[#d4f23b] text-black font-bold rounded hover:bg-[#c3e031]">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-8 py-2 bg-[#d4f23b] text-black font-bold rounded hover:bg-[#c3e031]">
                  {loading ? 'Saving...' : 'Add Signal'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PUBLISH CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0f1523] border border-slate-400 dark:border-white/10 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-[#1A2235]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-lime-700 dark:text-[#d4f23b]" />
                  Signal Publish Consent
                </h3>
                <button type="button" onClick={() => setShowConfirmModal(false)} className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300">
                <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3">
                  <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Terms & Conditions</p>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    By publishing this trade signal, you verify that this advisory recommendation complies with the SEBI (Research Analyst) Regulations, 2014. You confirm that you have conducted appropriate research/analysis, disclosed any conflict of interest, and that the advice is suitable for target plan subscribers.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={tncChecked}
                      onChange={e => setTncChecked(e.target.checked)}
                      className="mt-1 accent-[#d4f23b] h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:text-white transition-colors">
                      I accept the <a href="/terms" target="_blank" rel="noreferrer" className="text-lime-700 dark:text-[#d4f23b] hover:underline font-semibold">Terms & Conditions / Redirection Guidelines</a>.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={e => setConsentChecked(e.target.checked)}
                      className="mt-1 accent-[#d4f23b] h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:text-white transition-colors">
                      I provide my consent to immediately publish this trade signal to all active plan subscribers.
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-[#1A2235] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 text-slate-900 dark:text-white rounded font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={!tncChecked || !consentChecked || loading}
                  className="px-5 py-2.5 bg-[#d4f23b] text-black font-bold rounded text-sm hover:bg-[#c3e031] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Confirm & Publish'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CLOSE SIGNAL MODAL */}
        {closeSignalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-[#0B101E]/80 backdrop-blur-md p-4">
            <div className="bg-white dark:bg-[#151c2c]/90 backdrop-blur-xl border border-slate-400 dark:border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all">
              <div className="flex justify-between items-center p-6 border-b border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-[#1A2235]">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Close Signal: {closeSignalModal.stock?.symbol}
                </h3>
                <button type="button" onClick={() => setCloseSignalModal(null)} className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCloseSubmit} className="overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Radio Buttons (Pill Cards) */}
                  <div className="flex flex-wrap gap-3 border-b border-slate-300 dark:border-white/5 pb-6">
                    {['Fully Closed', 'Partially Closed', 'SL Hit', 'Closed Signal', 'Avoid Signal'].map(status => (
                      <label key={status} className={`flex-1 min-w-[120px] p-3 rounded-xl border cursor-pointer transition-all duration-300 text-center ${closeStatus === status ? 'border-[#d4f23b] bg-[#d4f23b]/10 shadow-[0_0_15px_rgba(212,242,59,0.2)]' : 'border-slate-400 dark:border-white/10 hover:border-slate-400 dark:border-white/30 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}>
                        <input
                          type="radio"
                          name="closeStatus"
                          value={status}
                          checked={closeStatus === status}
                          onChange={(e) => setCloseStatus(e.target.value)}
                          className="hidden"
                        />
                        <span className={`text-sm tracking-wide ${closeStatus === status ? 'text-lime-700 dark:text-[#d4f23b] font-bold' : 'text-slate-600 dark:text-gray-400 font-medium'}`}>{status}</span>
                      </label>
                    ))}
                  </div>

                  {/* Dynamic Inputs */}
                  {(closeStatus === 'Fully Closed' || closeStatus === 'Partially Closed') && (
                    <div className="space-y-4">
                      <label className="flex items-center space-x-4 bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 transition-colors cursor-pointer">
                        <input type="checkbox" checked={closeStatus === 'Fully Closed' || closeTargets.t1} disabled={closeStatus === 'Fully Closed'} onChange={(e) => setCloseTargets({ ...closeTargets, t1: e.target.checked })} className="accent-[#d4f23b] w-5 h-5 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="w-20 font-bold text-sm text-slate-800 dark:text-gray-200">Target 1</span>
                        <input type="text" readOnly value={`₹ ${closeSignalModal.target1 || ''}`} className="bg-white dark:bg-[#0B101E] border border-slate-300 dark:border-white/5 rounded-md px-4 py-2 text-sm text-slate-700 dark:text-gray-300 flex-1 font-semibold cursor-not-allowed" />
                      </label>
                      {closeSignalModal.target2 && (
                        <label className="flex items-center space-x-4 bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 transition-colors cursor-pointer">
                          <input type="checkbox" checked={closeStatus === 'Fully Closed' || closeTargets.t2} disabled={closeStatus === 'Fully Closed'} onChange={(e) => setCloseTargets({ ...closeTargets, t2: e.target.checked })} className="accent-[#d4f23b] w-5 h-5 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                          <span className="w-20 font-bold text-sm text-slate-800 dark:text-gray-200">Target 2</span>
                          <input type="text" readOnly value={`₹ ${closeSignalModal.target2 || ''}`} className="bg-white dark:bg-[#0B101E] border border-slate-300 dark:border-white/5 rounded-md px-4 py-2 text-sm text-slate-700 dark:text-gray-300 flex-1 font-semibold cursor-not-allowed" />
                        </label>
                      )}
                      {closeSignalModal.target3 && (
                        <label className="flex items-center space-x-4 bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 transition-colors cursor-pointer">
                          <input type="checkbox" checked={closeStatus === 'Fully Closed' || closeTargets.t3} disabled={closeStatus === 'Fully Closed'} onChange={(e) => setCloseTargets({ ...closeTargets, t3: e.target.checked })} className="accent-[#d4f23b] w-5 h-5 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                          <span className="w-20 font-bold text-sm text-slate-800 dark:text-gray-200">Target 3</span>
                          <input type="text" readOnly value={`₹ ${closeSignalModal.target3 || ''}`} className="bg-white dark:bg-[#0B101E] border border-slate-300 dark:border-white/5 rounded-md px-4 py-2 text-sm text-slate-700 dark:text-gray-300 flex-1 font-semibold cursor-not-allowed" />
                        </label>
                      )}
                      <label className="flex items-center space-x-4 bg-slate-100 dark:bg-white/5 p-3 rounded-lg border border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 transition-colors cursor-pointer">
                        <input type="checkbox" checked={closeStatus === 'Fully Closed' || closeTargets.close} disabled={closeStatus === 'Fully Closed'} onChange={(e) => setCloseTargets({ ...closeTargets, close: e.target.checked })} className="accent-[#d4f23b] w-5 h-5 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                        <span className="font-bold text-sm text-slate-800 dark:text-gray-200">Close</span>
                      </label>
                    </div>
                  )}

                  {(closeStatus === 'SL Hit' || closeStatus === 'Closed Signal') && (
                    <div>
                      <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-gray-300 tracking-wide">Exit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={closeExitPrice}
                        onChange={(e) => setCloseExitPrice(e.target.value)}
                        className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4f23b]/50 focus:border-[#d4f23b] transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-gray-300 tracking-wide">Remark</label>
                    <textarea
                      value={closeRemark}
                      onChange={(e) => setCloseRemark(e.target.value)}
                      placeholder="Enter remark..."
                      rows={4}
                      className="w-full bg-white dark:bg-[#0B101E] border border-slate-400 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4f23b]/50 focus:border-[#d4f23b] transition-all resize-none"
                    ></textarea>
                  </div>

                </div>
                <div className="p-6 border-t border-slate-300 dark:border-white/5 bg-white dark:bg-[#151c2c] flex justify-end gap-4 rounded-b-2xl">
                  <button type="button" onClick={() => setCloseSignalModal(null)} className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 text-slate-900 dark:text-white rounded-xl font-semibold text-sm transition-all duration-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[#d4f23b] text-black font-bold rounded-xl shadow-[0_0_15px_rgba(212,242,59,0.3)] hover:bg-[#c3e031] hover:shadow-[0_0_25px_rgba(212,242,59,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'Submitting...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REPORT OPTIONS MODAL */}
        {reportOptionsModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1A2235] border border-slate-300 dark:border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {reportOptionsModal.reportUrl ? 'Update Research Report' : 'Research Report Options'}
                </h3>
                <button onClick={() => setReportOptionsModal(null)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {reportOptionsModal.reportUrl && (
                  <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-lg text-orange-800 dark:text-orange-300 text-sm">
                    <strong>Warning:</strong> A report already exists for this signal. Selecting an option below will permanently replace the existing report.
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={() => {
                      if (!user?.tenant?.coSignatureUrl) {
                        toast.error('Research Reports cannot be generated without an active Research Analyst signature.');
                        return;
                      }
                      const s = reportOptionsModal;
                      setReportOptionsModal(null);
                      setReportPreviewModal(s);
                    }}
                    className="w-full p-4 border border-slate-200 dark:border-white/10 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-white/5 transition text-left flex items-center gap-4"
                  >
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{reportOptionsModal.reportUrl ? 'Recreate Report' : 'Create Report'}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generate a professional PDF report using the system's template builder.</p>
                    </div>
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      id="reportPdfUpload"
                      className="hidden"
                      accept="application/pdf"
                      onChange={(e) => handleUploadReportFile(e, reportOptionsModal)}
                      disabled={uploadingReportFor === reportOptionsModal.id}
                    />
                    <label
                      htmlFor="reportPdfUpload"
                      className={`w-full p-4 border border-slate-200 dark:border-white/10 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-white/5 transition text-left flex items-center gap-4 cursor-pointer ${uploadingReportFor === reportOptionsModal.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                        {uploadingReportFor === reportOptionsModal.id ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{reportOptionsModal.reportUrl ? 'Reupload PDF' : 'Upload PDF'}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload an existing PDF document directly from your computer.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT PREVIEW MODAL */}
        {reportPreviewModal && (
          <ReportPreviewModal
            signal={reportPreviewModal}
            user={user}
            onClose={() => setReportPreviewModal(null)}
            onSuccess={() => fetchSignals()}
          />
        )}

        {/* AVOID REMARK MODAL */}
        {avoidRemarkModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-100 dark:bg-[#1A2235] border border-slate-400 dark:border-white/10 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-3 bg-[#4c1d95] border-b border-[#4c1d95]">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white px-2">Description</h3>
                <button onClick={() => setAvoidRemarkModal(null)} className="text-slate-900 dark:text-white/80 hover:text-slate-900 dark:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 bg-white min-h-[150px]">
                <p className="text-black text-sm font-semibold">{avoidRemarkModal}</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW SIGNAL DETAILS MODAL */}
        {viewSignalDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
            <div className="bg-white dark:bg-[#151c2c] border border-slate-400 dark:border-white/10 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] w-full max-w-2xl flex flex-col max-h-[90vh] my-auto">
              <div className="flex justify-between items-center p-5 border-b border-slate-300 dark:border-white/5 bg-white dark:bg-[#0B101E] shrink-0 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-lime-700 dark:text-[#d4f23b]" />
                  Signal Details
                </h3>
                <button onClick={() => setViewSignalDetails(null)} className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 bg-white dark:bg-[#151c2c]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Segment</p><p className="font-semibold">{viewSignalDetails.segment || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Stock Symbol</p><p className="font-bold text-lime-700 dark:text-[#d4f23b]">{viewSignalDetails.stock?.symbol || 'N/A'}</p></div>
                  <div>
                    <p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Strike Price</p>
                    <p className="font-semibold">{viewSignalDetails.strikePrice ? `${viewSignalDetails.strikePrice} ${viewSignalDetails.optionType || ''}` : 'N/A'}</p>
                  </div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Plan</p><p className="font-semibold">{viewSignalDetails.planName || 'N/A'}</p></div>

                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Call Type</p><p className={`font-semibold ${viewSignalDetails.callType === 'BUY' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{viewSignalDetails.callType || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Entry Type</p><p className="font-semibold">{viewSignalDetails.entryType || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Trade Duration</p><p className="font-semibold">{viewSignalDetails.tradeDuration || 'N/A'}</p></div>

                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Entry Price</p><p className="font-semibold">₹ {viewSignalDetails.entryPrice || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Stoploss</p><p className="font-semibold text-red-600 dark:text-red-400">₹ {viewSignalDetails.stoploss || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Expiry Date</p><p className="font-semibold">{viewSignalDetails.expiryDate ? new Date(viewSignalDetails.expiryDate).toLocaleDateString() : 'N/A'}</p></div>

                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Entry Date & Time</p><p className="font-semibold">{viewSignalDetails.createdAt ? new Date(viewSignalDetails.createdAt).toLocaleString() : 'N/A'}</p></div>
                </div>

                <div className="border-t border-slate-300 dark:border-white/5 pt-6 grid grid-cols-3 gap-6">
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Target 1</p><p className="font-semibold text-green-600 dark:text-green-400">₹ {viewSignalDetails.target1 || 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Target 2</p><p className="font-semibold text-green-600 dark:text-green-400">{viewSignalDetails.target2 ? `₹ ${viewSignalDetails.target2}` : 'N/A'}</p></div>
                  <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Target 3</p><p className="font-semibold text-green-600 dark:text-green-400">{viewSignalDetails.target3 ? `₹ ${viewSignalDetails.target3}` : 'N/A'}</p></div>
                </div>

                {viewSignalDetails.status === 'CLOSED' && (() => {
                  const isSuccess = viewSignalDetails.closeStatus === 'Fully Closed' || viewSignalDetails.closeStatus === 'Partially Closed' || viewSignalDetails.closeStatus === 'Target Hit';
                  const isNeutral = viewSignalDetails.closeStatus === 'Avoid Signal';
                  const bgClass = isSuccess ? 'bg-green-50 dark:bg-green-900/20 border-green-500/20' : (isNeutral ? 'bg-slate-50 dark:bg-slate-900/20 border-slate-500/20' : 'bg-red-50 dark:bg-red-900/20 border-red-500/20');
                  const textClass = isSuccess ? 'text-green-600 dark:text-green-400' : (isNeutral ? 'text-slate-600 dark:text-slate-400' : 'text-red-600 dark:text-red-400');
                  return (
                    <div className={`border-t border-slate-300 dark:border-white/5 pt-6 grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl border ${bgClass}`}>
                      <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Close Status</p><p className={`font-semibold ${textClass}`}>{viewSignalDetails.closeStatus || 'N/A'}</p></div>
                      <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Exit Price</p><p className={`font-semibold ${textClass}`}>{viewSignalDetails.exitPrice ? `₹ ${viewSignalDetails.exitPrice}` : 'N/A'}</p></div>
                      <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Targets Hit</p><p className={`font-semibold ${textClass} break-all`}>{viewSignalDetails.closeTargets || 'None'}</p></div>
                      <div><p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Exit Date</p><p className={`font-semibold ${textClass}`}>{viewSignalDetails.closedAt ? new Date(viewSignalDetails.closedAt).toLocaleString() : 'N/A'}</p></div>
                      {viewSignalDetails.closeRemark && (
                        <div className="col-span-2 md:col-span-4 mt-2">
                          <p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-1">Close Remark</p>
                          <p className="text-sm text-slate-700 dark:text-gray-300">{viewSignalDetails.closeRemark}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(viewSignalDetails.description || viewSignalDetails.reportUrl) && (
                  <div className="border-t border-slate-300 dark:border-white/5 pt-6 space-y-4">
                    {viewSignalDetails.description && (
                      <div>
                        <p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-2">Description</p>
                        <p className="text-sm bg-slate-100 dark:bg-[#1A2235] p-4 rounded text-slate-700 dark:text-gray-300 leading-relaxed">{viewSignalDetails.description}</p>
                      </div>
                    )}
                    {viewSignalDetails.reportUrl && (
                      <div>
                        <p className="text-slate-600 dark:text-gray-500 text-xs uppercase mb-2">Attached Report</p>
                        <button
                          onClick={() => handleSafeDownload(viewSignalDetails.reportUrl)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download Report
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-5 border-t border-slate-300 dark:border-white/5 bg-white dark:bg-[#0B101E] text-right shrink-0 rounded-b-2xl">
                <button onClick={() => setViewSignalDetails(null)} className="px-6 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 rounded-lg font-bold transition-all">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showMobilePreview && isMobileVisible && (
        <div className="hidden lg:block w-[280px] shrink-0 border-l border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#0B101E] relative">
          <div className="sticky top-0 h-screen overflow-y-auto p-4 flex justify-center">
            <div className="transform scale-[0.85] origin-top">
              <MobilePreview
                mode={closeSignalModal ? 'CLOSE' : view}
                signals={filteredSignals}
                isViewOnly={isViewOnly}
                onSendAlert={async (trade, message) => {
                  try {
                    const res = await api.request(`/signals/${trade.id}/messages`, {
                      method: 'POST',
                      body: JSON.stringify({ message })
                    });
                    if (res.success) {
                      toast.success('Alert sent successfully!');
                      fetchSignals();
                      return true;
                    } else {
                      toast(res.message);
                      return false;
                    }
                  } catch (err: any) {
                    toast.error('Failed to send alert: ' + err.message);
                    return false;
                  }
                }}
                newSignalData={closeSignalModal ? {
                  segment: closeSignalModal.segment,
                  stock: closeSignalModal.stock?.symbol,
                  callType: closeSignalModal.callType,
                  tradeDuration: closeSignalModal.tradeDuration,
                  entryType: closeSignalModal.entryType,
                  entryPrice: closeSignalModal.entryPrice,
                  target1: closeSignalModal.target1,
                  target2: closeSignalModal.target2,
                  target3: closeSignalModal.target3,
                  stopLoss: closeSignalModal.stopLoss,
                  description: closeRemark
                } : {
                  segment: segment,
                  stock: stockSearchQuery,
                  callType: callType,
                  tradeDuration: tradeDuration,
                  entryType: entryType,
                  entryPrice: entryPrice,
                  target1: target1,
                  target2: target2,
                  target3: target3,
                  stopLoss: stoploss,
                  description: description
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A2235] rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-100 dark:border-white/5">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isViewOnly ? 'View Alerts for' : 'Send Alert for'} {alertTrade?.stock?.symbol || 'Trade'}
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {/* Alert History */}
              {alertTrade?.messages && alertTrade.messages.length > 0 && (
                <div className="mb-5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                    Previous Alerts ({alertTrade.messages.length})
                  </label>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {alertTrade.messages.map((msg: any) => (
                      <div key={msg.id} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-3 rounded-xl">
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{msg.message}</p>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> {new Date(msg.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isViewOnly && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">New Alert Message</label>
                  <textarea
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-[#0f1523] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors resize-none"
                    placeholder="Type your alert message here (e.g. Book partial profit)..."
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 flex justify-end gap-3">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                {isViewOnly ? 'Close' : 'Cancel'}
              </button>
              {!isViewOnly && (
                <button
                  onClick={handleSendAlert}
                  disabled={sendingAlert || !alertMessage.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingAlert && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
