'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ExternalLink,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  ArrowRight,
  List,
  Grid,
  Lock,
  UploadCloud,
  Loader2,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface ComplianceCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklist: any[];
  checklistHistory?: any[];
  onOpenAuditModal?: (requirement: any) => void;
  onReloadData?: () => void;
  userRole?: string;
}

export interface CalendarEvent {
  id: string;
  serialNo: number;
  requirementId: string;
  requirement: string;
  frequency: string;
  severityLevel: string;
  penaltyAmount?: string | null;
  dateStr: string; // YYYY-MM-DD
  dueDateFormatted: string;
  daysLeft: number;
  canSubmit: boolean;
  sourceType: 'SCHEDULED' | 'AUDIT_LOG';
  status: 'PENDING' | 'COMPLIANT' | 'OVERDUE' | 'SCHEDULED' | 'NON_COMPLIANT' | 'PENALTY_RESOLVED' | string;
  previousStatus?: string;
  officerRemarks?: string;
  proofDocumentUrl?: string;
  changedByName?: string;
  timestamp?: string;
  rawItem: any;
}

export default function ComplianceCalendarModal({
  isOpen,
  onClose,
  checklist = [],
  checklistHistory = [],
  onOpenAuditModal,
  onReloadData,
  userRole
}: ComplianceCalendarModalProps) {
  // Current view date (year & month)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLIANT' | 'OVERDUE' | 'SCHEDULED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: CalendarEvent[] } | null>(null);

  // In-calendar audit submission state
  const [isSubmittingAudit, setIsSubmittingAudit] = useState<boolean>(false);
  const [showSubmitForm, setShowSubmitForm] = useState<boolean>(false);
  const [auditFormStatus, setAuditFormStatus] = useState<string>('COMPLIANT');
  const [auditFormRemarks, setAuditFormRemarks] = useState<string>('');
  const [auditFormProof, setAuditFormProof] = useState<File | null>(null);
  const [complaintReports, setComplaintReports] = useState<any[]>([]);

  // Fetch complaint report history for automatic sync of monthly complaint disclosure status
  useEffect(() => {
    if (isOpen) {
      api.request('/complaint-report/history')
        .then((res: any) => {
          if (res && res.success && Array.isArray(res.data)) {
            setComplaintReports(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSubmitForm) setShowSubmitForm(false);
        else if (selectedEvent) setSelectedEvent(null);
        else if (selectedDayEvents) setSelectedDayEvents(null);
        else onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedEvent, selectedDayEvents, showSubmitForm, onClose]);

  // When selected event changes, reset in-calendar form
  useEffect(() => {
    setShowSubmitForm(false);
    setAuditFormStatus('COMPLIANT');
    setAuditFormRemarks('');
    setAuditFormProof(null);
  }, [selectedEvent]);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to format Date to YYYY-MM-DD
  const toDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // DYNAMIC COMPLIANCE CALENDAR ENGINE
  // Projects requirements for the viewed month (+/- 1 month for full calendar grid display)
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const eventKeyMap = new Set<string>();

    const addEventSafely = (ev: CalendarEvent) => {
      const key = `${ev.serialNo}_${ev.dateStr}`;
      if (!eventKeyMap.has(key)) {
        eventKeyMap.add(key);
        events.push(ev);
      }
    };

    // 1. Process Past & Resolved Audits from checklistHistory
    checklistHistory.forEach((hist: any, idx: number) => {
      const dateRaw = hist.createdAt || hist.timestamp || hist.updatedAt;
      if (!dateRaw) return;

      const dateObj = new Date(dateRaw);
      if (isNaN(dateObj.getTime())) return;

      const dateStr = toDateKey(dateObj);
      const req = hist.requirement || {};
      const newStatus = hist.newStatus || 'COMPLIANT';
      const daysLeft = Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 3600 * 24));

      addEventSafely({
        id: `hist-${hist._id || hist.id || idx}-${dateStr}`,
        serialNo: req.serialNo || hist.serialNo || idx + 1,
        requirementId: req._id || req.id || hist.requirementId || '',
        requirement: req.requirement || hist.requirementText || 'Compliance Task Audit',
        frequency: req.frequency || hist.periodLabel || 'Historical Audit',
        severityLevel: req.severityLevel || 'MODERATE',
        penaltyAmount: req.penaltyAmount || null,
        dateStr,
        dueDateFormatted: dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        daysLeft,
        canSubmit: false, // already resolved in history
        sourceType: 'AUDIT_LOG',
        status: newStatus,
        previousStatus: hist.previousStatus || 'PENDING',
        officerRemarks: hist.officerRemarks || '',
        proofDocumentUrl: hist.proofDocumentUrl || '',
        changedByName: hist.changedBy?.name || hist.updatedByName || 'Compliance Officer',
        timestamp: dateRaw,
        rawItem: hist
      });
    });

    // 2. Generate Compliance Requirements for Viewed Month (+/- 1 month)
    // Target months: previous month, current viewed month, next month
    const targetMonths = [
      new Date(year, month - 1, 1),
      new Date(year, month, 1),
      new Date(year, month + 1, 1)
    ];

    targetMonths.forEach((targetMonthDate) => {
      const tYear = targetMonthDate.getFullYear();
      const tMonth = targetMonthDate.getMonth(); // 0-indexed (0=Jan, 2=Mar, 8=Sep, 9=Oct, 11=Dec)
      const lastDayOfMonth = new Date(tYear, tMonth + 1, 0).getDate();
      const monthEndDateStr = `${tYear}-${String(tMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      const monthEndDueDate = new Date(tYear, tMonth, lastDayOfMonth, 23, 59, 59);

      // Ensure Monthly Complaint Data Disclosure (Sr. 50) is included even if not loaded from cache
      const activeChecklist = [...checklist];
      if (!activeChecklist.some((c: any) => c.serialNo === 50)) {
        activeChecklist.push({
          _id: 'sebi-req-sr50-complaint-data',
          serialNo: 50,
          requirement: 'Monthly Investor Complaints Data Disclosure (Website/Portal)',
          frequency: 'Monthly (by 7th of succeeding month)',
          frequencyType: 'MONTHLY',
          severityLevel: 'HIGH',
          penaltyAmount: 'General Regulatory Non-Compliance - ₹5,000',
          isActive: true
        });
      }

      activeChecklist.forEach((item: any, idx: number) => {
        const serialNo = item.serialNo || idx + 1;
        const freq = (item.frequency || '').toLowerCase();
        let appliesToThisMonth = false;
        let dueDateForMonth = monthEndDueDate;
        let dateStrForMonth = monthEndDateStr;

        // Schedule mapping by SEBI Compliance Frequency:
        // A. Monthly Investor Complaints Data Update / Disclosure (Sr. 50 / Monthly) -> Due on 7th of every month
        if (
          serialNo === 50 ||
          item.frequencyType === 'MONTHLY' ||
          freq.includes('7th') ||
          (item.requirement && item.requirement.toLowerCase().includes('complaint data'))
        ) {
          appliesToThisMonth = true;
          dueDateForMonth = new Date(tYear, tMonth, 7, 23, 59, 59);
          dateStrForMonth = `${tYear}-${String(tMonth + 1).padStart(2, '0')}-07`;
        }
        // B. Annual compliance audit (Sr. 46) -> Due in March (Financial Year End: March 31)
        else if (freq.includes('annual') || serialNo === 46) {
          if (tMonth === 2) { // March
            appliesToThisMonth = true;
          }
        }
        // C. Audit completion timeline (Sr. 47) -> Within 6 months from FY end -> September 30
        else if (freq.includes('6 months') || serialNo === 47) {
          if (tMonth === 8) { // September
            appliesToThisMonth = true;
          }
        }
        // D. ATR submission (Sr. 48) -> Within 1 month of audit report -> October 31
        else if (freq.includes('atr') || serialNo === 48) {
          if (tMonth === 9) { // October
            appliesToThisMonth = true;
          }
        }
        // E. Continuous compliance / As applicable / Within 21 days
        // In SEBI regulations, continuous monitoring items have recurring monthly checkpoints on month-end
        else {
          appliesToThisMonth = true;
        }

        if (!appliesToThisMonth) return;

        // Calculate days left relative to current real-time
        const daysLeft = Math.ceil((dueDateForMonth.getTime() - Date.now()) / (1000 * 3600 * 24));

        // Submission window condition:
        // Officer can submit when within 30 days before deadline (or overdue)
        const canSubmit = daysLeft <= 30;

        // Check if an audit record exists for this item
        let effectiveStatus: string = 'SCHEDULED';
        let officerRemarks = '';
        let proofDocumentUrl = '';
        let changedByName = 'Compliance Officer';
        let timestamp = '';

        // Check active audit on item if in the active cycle
        const isMonthlyComplaintItem =
          serialNo === 50 ||
          item.frequencyType === 'MONTHLY' ||
          freq.includes('7th') ||
          (item.requirement && item.requirement.toLowerCase().includes('complaint data'));

        if (isMonthlyComplaintItem) {
          // SEBI monthly complaint disclosure due on the 7th covers the preceding calendar month
          const targetReportMonth = tMonth === 0 ? 12 : tMonth;
          const targetReportYear = tMonth === 0 ? tYear - 1 : tYear;
          const matchedReport = complaintReports.find(
            (r: any) => r.month === targetReportMonth && r.year === targetReportYear
          );

          if (matchedReport) {
            effectiveStatus = 'COMPLIANT';
            const repMonthName = new Date(targetReportYear, targetReportMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            officerRemarks = `Monthly Investor Complaints Report for ${repMonthName} is published on website.`;
            timestamp = matchedReport.updatedAt || '';
          } else if (item.audit && item.audit.status === 'COMPLIANT') {
            effectiveStatus = 'COMPLIANT';
            officerRemarks = item.audit.officerRemarks || '';
            proofDocumentUrl = item.audit.proofDocumentUrl || '';
            timestamp = item.audit.updatedAt || '';
          } else if (daysLeft < 0) {
            effectiveStatus = 'OVERDUE';
          } else if (daysLeft <= 30) {
            effectiveStatus = 'PENDING';
          } else {
            effectiveStatus = 'SCHEDULED';
          }
        } else if (item.audit && item.audit.status === 'COMPLIANT') {
          // Check if resolved in this month
          effectiveStatus = 'COMPLIANT';
          officerRemarks = item.audit.officerRemarks || '';
          proofDocumentUrl = item.audit.proofDocumentUrl || '';
          timestamp = item.audit.updatedAt || '';
        } else if (daysLeft < 0) {
          effectiveStatus = 'OVERDUE';
        } else if (daysLeft <= 30) {
          effectiveStatus = 'PENDING';
        } else {
          effectiveStatus = 'SCHEDULED';
        }

        addEventSafely({
          id: `req-${item._id || item.id || idx}-${dateStrForMonth}`,
          serialNo,
          requirementId: item._id || item.id || '',
          requirement: item.requirement || 'SEBI Regulatory Requirement',
          frequency: item.frequency || 'Periodic',
          severityLevel: item.severityLevel || 'MODERATE',
          penaltyAmount: item.penaltyAmount || null,
          dateStr: dateStrForMonth,
          dueDateFormatted: dueDateForMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          daysLeft,
          canSubmit,
          sourceType: 'SCHEDULED',
          status: effectiveStatus,
          officerRemarks,
          proofDocumentUrl,
          changedByName,
          timestamp,
          rawItem: item
        });
      });
    });

    return events;
  }, [checklist, checklistHistory, year, month, complaintReports]);

  // Filter events based on statusFilter and searchQuery
  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      // Status filter
      if (statusFilter === 'PENDING' && ev.status !== 'PENDING') return false;
      if (statusFilter === 'COMPLIANT' && ev.status !== 'COMPLIANT' && ev.status !== 'PENALTY_RESOLVED') return false;
      if (statusFilter === 'OVERDUE' && ev.status !== 'OVERDUE' && ev.status !== 'NON_COMPLIANT') return false;
      if (statusFilter === 'SCHEDULED' && ev.status !== 'SCHEDULED') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesReq = ev.requirement.toLowerCase().includes(q);
        const matchesSr = String(ev.serialNo).includes(q);
        const matchesRemarks = (ev.officerRemarks || '').toLowerCase().includes(q);
        const matchesStatus = ev.status.toLowerCase().includes(q);
        if (!matchesReq && !matchesSr && !matchesRemarks && !matchesStatus) return false;
      }

      return true;
    });
  }, [allEvents, statusFilter, searchQuery]);

  // Group events by dateStr for the month grid
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(ev => {
      const list = map.get(ev.dateStr) || [];
      list.push(ev);
      map.set(ev.dateStr, list);
    });
    return map;
  }, [filteredEvents]);

  // Generate 35 or 42 grid cells for the month view (Sunday to Saturday)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const date = new Date(year, month - 1, d);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Pad end of month to always complete the final week row (multiple of 7)
    const extraNeeded = (7 - (days.length % 7)) % 7;
    const targetTotal = (days.length + extraNeeded <= 35) ? 35 : 42;
    const finalPadding = targetTotal - days.length;
    for (let d = 1; d <= finalPadding; d++) {
      const date = new Date(year, month + 1, d);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date,
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    return days;
  }, [year, month]);

  // Color helper based on event status
  const getEventBadgeClasses = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
      case 'PENALTY_RESOLVED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-l-[3px] border-l-emerald-500 hover:bg-emerald-500/25';
      case 'OVERDUE':
      case 'NON_COMPLIANT':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-l-[3px] border-l-rose-500 hover:bg-rose-500/25';
      case 'PENDING':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-l-[3px] border-l-amber-500 hover:bg-amber-500/25';
      case 'SCHEDULED':
      default:
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-l-[3px] border-l-blue-500 hover:bg-blue-500/25';
    }
  };

  const getStatusPillClasses = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
      case 'PENALTY_RESOLVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'OVERDUE':
      case 'NON_COMPLIANT':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SCHEDULED':
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
  };

  // Direct In-Calendar Audit Submission Handler
  const handleInCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const reqId = selectedEvent.requirementId || selectedEvent.rawItem?._id || selectedEvent.rawItem?.id;
    if (!reqId) {
      toast.error('Unable to locate requirement ID for submission.');
      return;
    }

    if (!auditFormRemarks.trim()) {
      toast.error('Please enter officer remarks for verification.');
      return;
    }

    setIsSubmittingAudit(true);
    try {
      const fd = new FormData();
      fd.append('status', auditFormStatus);
      fd.append('officerRemarks', auditFormRemarks.trim());
      if (auditFormProof) {
        fd.append('proofDocumentUrl', auditFormProof);
      }

      const res = await api.updateAuditStatus(reqId, fd);
      if (res.success) {
        toast.success(`Compliance updated: SR. ${selectedEvent.serialNo} marked ${auditFormStatus}!`);
        // Update current selected event locally
        setSelectedEvent({
          ...selectedEvent,
          status: auditFormStatus,
          officerRemarks: auditFormRemarks.trim(),
          proofDocumentUrl: res.data?.proofDocumentUrl || '',
          timestamp: new Date().toISOString()
        });
        setShowSubmitForm(false);
        // Reload parent data if callback provided
        if (onReloadData) {
          onReloadData();
        }
      } else {
        toast.error(res.message || 'Failed to submit compliance record.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // Agenda view items grouped by date
  const agendaList = useMemo(() => {
    // Sort events by date
    const sorted = [...filteredEvents].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const groups: { dateStr: string; displayDate: string; items: CalendarEvent[] }[] = [];
    
    sorted.forEach(ev => {
      let group = groups.find(g => g.dateStr === ev.dateStr);
      if (!group) {
        const dObj = new Date(ev.dateStr + 'T00:00:00');
        const displayDate = dObj.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        group = { dateStr: ev.dateStr, displayDate, items: [] };
        groups.push(group);
      }
      group.items.push(ev);
    });

    return groups;
  }, [filteredEvents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[92vh] max-h-[960px] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* GOOGLE CALENDAR HEADER                                                    */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Brand + Today + Chevrons + Month/Year */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Compliance Calendar
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    SEBI RA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Track upcoming regulatory due dates &amp; audit history
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

            {/* Google Calendar 'Today' Button */}
            <button
              onClick={goToToday}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              Today
            </button>

            {/* Chevron Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 rounded-full text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current Month Name */}
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white min-w-[140px]">
              {monthName}
            </h3>
          </div>

          {/* Right Controls: Search + Status Filter + View Mode + Close */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Search input */}
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search checklist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 lg:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-white/10 text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'ALL' ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-amber-500'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('SCHEDULED')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'SCHEDULED' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'}`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setStatusFilter('COMPLIANT')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'COMPLIANT' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'}`}
              >
                Compliant
              </button>
              <button
                onClick={() => setStatusFilter('OVERDUE')}
                className={`px-2.5 py-1 rounded-lg transition ${statusFilter === 'OVERDUE' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'}`}
              >
                Overdue
              </button>
            </div>

            {/* View Mode Toggle: Month vs Agenda */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-white/10">
              <button
                onClick={() => setViewMode('month')}
                title="Month Grid View"
                className={`p-1.5 rounded-lg transition ${viewMode === 'month' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                title="Agenda / Schedule List"
                className={`p-1.5 rounded-lg transition ${viewMode === 'agenda' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition active:scale-95"
              title="Close Calendar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUBHEADER: LEGEND & SUMMARY                                               */}
        {/* ========================================================================= */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto">
          <div className="flex items-center space-x-4 shrink-0">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Legend:</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Pending (&le; 30 Days)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Scheduled (Future &gt; 30 Days)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Compliant / Audited</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Overdue / Non-Compliant</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {filteredEvents.length} Event{filteredEvents.length === 1 ? '' : 's'} in View
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CALENDAR BODY                                                             */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950/40 p-3 sm:p-4">
          
          {/* 1. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="w-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm min-w-[750px] mb-4">
              
              {/* Day of Week Header */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-center py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-[2]">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-white/10">
                {calendarDays.map((day, idx) => {
                  const dayEvents = eventsByDate.get(day.dateStr) || [];
                  const MAX_VISIBLE = 3;
                  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
                  const extraCount = dayEvents.length - MAX_VISIBLE;

                  return (
                    <div
                      key={day.dateStr + '-' + idx}
                      className={`min-h-[95px] sm:min-h-[110px] p-1.5 sm:p-2 flex flex-col transition group ${
                        day.isCurrentMonth
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-slate-50/60 dark:bg-slate-900/30 text-slate-400 dark:text-slate-600'
                      } ${day.isToday ? 'bg-blue-50/40 dark:bg-blue-950/10' : ''}`}
                    >
                      {/* Day Header (Date Number) */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full transition ${
                            day.isToday
                              ? 'bg-blue-600 text-white font-extrabold shadow-sm'
                              : day.isCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Pills */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {visibleEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block transition shadow-2xs ${getEventBadgeClasses(
                              ev.status
                            )}`}
                            title={`[SR.${ev.serialNo}] ${ev.requirement}`}
                          >
                            <span className="font-bold mr-1">#{ev.serialNo}</span>
                            <span>{ev.requirement}</span>
                          </button>
                        ))}

                        {/* +X More Pill */}
                        {extraCount > 0 && (
                          <button
                            onClick={() => setSelectedDayEvents({ dateStr: day.dateStr, events: dayEvents })}
                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline pl-1 block transition text-left"
                          >
                            +{extraCount} more...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. AGENDA / SCHEDULE VIEW */}
          {viewMode === 'agenda' && (
            <div className="max-w-4xl mx-auto space-y-6 py-2">
              {agendaList.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-8">
                  <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">No compliance events found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Try adjusting your filters or search keywords to view compliance alerts.
                  </p>
                </div>
              ) : (
                agendaList.map((group) => (
                  <div
                    key={group.dateStr}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden"
                  >
                    {/* Date Header */}
                    <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {group.displayDate}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {group.items.length} Task{group.items.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Events List */}
                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                      {group.items.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                SR. {ev.serialNo}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${getStatusPillClasses(
                                  ev.status
                                )}`}
                              >
                                {ev.status.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({ev.frequency})
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                              {ev.requirement}
                            </p>
                            {ev.officerRemarks && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                                &ldquo;{ev.officerRemarks}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center space-x-1"
                            >
                              <span>View Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DAY EVENTS POPOVER (WHEN +X MORE IS CLICKED)                              */}
        {/* ========================================================================= */}
        {selectedDayEvents && (
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Compliance Tasks on {selectedDayEvents.dateStr}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {selectedDayEvents.events.length} task{selectedDayEvents.events.length === 1 ? '' : 's'} scheduled / audited
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {selectedDayEvents.events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(ev);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start space-x-2.5 ${getEventBadgeClasses(
                      ev.status
                    )}`}
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-[10px]">SR. {ev.serialNo}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] font-bold border uppercase ${getStatusPillClasses(
                            ev.status
                          )}`}
                        >
                          {ev.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold leading-snug line-clamp-2">
                        {ev.requirement}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EVENT DETAILS & SUBMISSION MODAL                                          */}
        {/* ========================================================================= */}
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
              
              {/* Header Bar */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      SR. {selectedEvent.serialNo}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusPillClasses(
                        selectedEvent.status
                      )}`}
                    >
                      {selectedEvent.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Priority: {selectedEvent.severityLevel}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedEvent.requirement}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Details */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                
                {/* Due Date & Frequency Details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Scheduled / Due Date
                    </span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedEvent.dueDateFormatted}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Frequency
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {selectedEvent.frequency}
                    </span>
                  </div>
                </div>

                {/* SEBI Annexure-B guidance for monthly complaint data */}
                {(selectedEvent.serialNo === 50 || selectedEvent.requirement.toLowerCase().includes('complaint data')) && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-bold">SEBI Annexure-B Mandate (Monthly Disclosure):</span>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        Research Analysts must update and publish previous month&apos;s investor complaints data table on website/portal by 7th of every month. You can also view or save this data directly from the <strong>Complaint Data</strong> tab in the sidebar.
                      </p>
                    </div>
                  </div>
                )}

                {/* Regulatory Penalty clause if applicable */}
                {selectedEvent.penaltyAmount && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        Applicable SEBI Penalty Clause
                      </span>
                      <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                        {selectedEvent.penaltyAmount}
                      </p>
                    </div>
                  </div>
                )}

                {/* IN-CALENDAR COMPLIANCE SUBMISSION FORM (COMPLIANCE OFFICER ONLY) */}
                {showSubmitForm && userRole === 'COMPLIANCE_OFFICER' ? (
                  <form onSubmit={handleInCalendarSubmit} className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/30 space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Submit Compliance Verification</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowSubmitForm(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Compliance Status *
                      </label>
                      <select
                        value={auditFormStatus}
                        onChange={(e) => setAuditFormStatus(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="COMPLIANT">Compliant (Verified)</option>
                        <option value="NON_COMPLIANT">Non-Compliant (Breached)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Officer Remarks &amp; Verification Details *
                      </label>
                      <textarea
                        value={auditFormRemarks}
                        onChange={(e) => setAuditFormRemarks(e.target.value)}
                        placeholder="State actions taken to verify or fulfill this SEBI compliance requirement..."
                        rows={3}
                        required
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Upload Proof Document (Optional)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setAuditFormProof(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/40 dark:file:text-blue-300"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowSubmitForm(false)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingAudit}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        {isSubmittingAudit ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm &amp; Record Verification</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* AUDIT DETAILS / RESOLUTION TRAIL */
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Audit &amp; Compliance Resolution Record</span>
                    </span>

                    {selectedEvent.officerRemarks ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                            Compliance Officer Remarks &amp; Verification Notes
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
                            {selectedEvent.officerRemarks}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-500/10 gap-2">
                          <span>
                            Audited By: <strong className="text-slate-700 dark:text-slate-300">{selectedEvent.changedByName}</strong>
                          </span>
                          {selectedEvent.timestamp && (
                            <span>
                              Recorded At: {new Date(selectedEvent.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>

                        {/* Proof Document attachment if available */}
                        {selectedEvent.proofDocumentUrl && (
                          <div className="pt-2">
                            <a
                              href={selectedEvent.proofDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Download Supporting Audit Document</span>
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedEvent.status === 'SCHEDULED'
                            ? 'This compliance requirement is scheduled for future review.'
                            : selectedEvent.status === 'PENDING' || selectedEvent.status === 'OVERDUE'
                            ? 'This compliance requirement is currently pending action. No audit remarks or resolution records have been submitted yet.'
                            : 'No audit remarks recorded for this compliance item.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Close
                </button>

                {!showSubmitForm && (
                  <div>
                    {/* CASE 1: Can Submit (Action window active: <= 30 days or overdue) - STRICTLY FOR COMPLIANCE OFFICER */}
                    {selectedEvent.canSubmit && selectedEvent.status !== 'COMPLIANT' && userRole === 'COMPLIANCE_OFFICER' ? (
                      <button
                        onClick={() => setShowSubmitForm(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center space-x-1.5 active:scale-95"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Update / Mark Compliant</span>
                      </button>
                    ) : !selectedEvent.canSubmit && selectedEvent.status !== 'COMPLIANT' && userRole === 'COMPLIANCE_OFFICER' ? (
                      /* CASE 2: Future / Upcoming (> 30 days away) */
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Submission opens 30 days before deadline</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
