import React, { useState, useMemo } from 'react';
import { SEBI_PENALTIES_MASTER } from '../data/sebiPenaltiesData';
import { Search, Download, AlertTriangle, ShieldAlert, Clock, X, DollarSign, ArrowUpDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight, List } from 'lucide-react';
// Statutory Compliance Schedule mapped from SEBI Regulations & RAASB Circulars
export const SEBI_CALENDAR_SCHEDULE = [
    {
        id: 'scores-monthly-disclosure',
        ruleSrNo: 41,
        title: 'Monthly SCORES & Grievance Data Disclosure',
        category: 'REPORTING',
        frequency: 'MONTHLY',
        frequencyLabel: 'Monthly (By 7th)',
        dueDayOfMonth: 7,
        statutoryDueDateText: '7th of Every Month',
        sebiRegulationRef: 'SEBI Circular SEBI/HO/OIAE/IGRD/CIR/P/2021/642 & RA Reg 2014',
        penaltyAmountText: '₹5,000 per violation',
        severity: 'LOW',
        consequence: 'Regulatory censure, non-disclosure penalty, and show-cause notice from SEBI/BASL for non-compliance with investor charter disclosures.',
        actionRequired: 'Collate all complaints received via SCORES, email, or physical letters during previous month. Update table on website & mobile application by 7th end-of-day.'
    },
    {
        id: 'kyc-agreement-recon',
        ruleSrNo: 19,
        title: 'Client KYC & Signed Agreement Monthly Reconciliation',
        category: 'CLIENT_OPS',
        frequency: 'MONTHLY',
        frequencyLabel: 'Monthly (By 10th)',
        dueDayOfMonth: 10,
        statutoryDueDateText: '10th of Every Month',
        sebiRegulationRef: 'SEBI Master Circular for Research Analysts & PMLA Regulations',
        penaltyAmountText: '₹1,000 per non-compliant client + Code of Conduct fine',
        severity: 'MEDIUM',
        consequence: 'Onboarding clients without verified KRA KYC or consent violates fundamental code of conduct. Risk of immediate suspension of affected accounts and per-client penalty.',
        actionRequired: 'Audit all new subscriptions activated in the previous month. Ensure PAN is validated via KRA/DigiLocker and written/digital agreement is archived.'
    },
    {
        id: 'monthly-recommendations-review',
        ruleSrNo: 34,
        title: 'Monthly Research Recommendations & Disclosures Audit',
        category: 'DISCLOSURES',
        frequency: 'MONTHLY',
        frequencyLabel: 'Monthly (Month-End)',
        dueDayOfMonth: 28,
        statutoryDueDateText: 'End of Every Month',
        sebiRegulationRef: 'Regulation 19 & 20, SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹10,000 per violation',
        severity: 'MEDIUM',
        consequence: 'Failure to provide mandatory disclosures (financial interest, holding, conflict) or failure to back research recommendations by rationales triggers ₹10,000 per instance fine.',
        actionRequired: 'Review all trade signals and reports sent across SMS, Telegram, and app during the month. Verify timestamping and standard SEBI disclaimers.'
    },
    {
        id: 'basl-quarterly-q1',
        ruleSrNo: 73,
        title: 'Q1 BASL / SEBI Quarterly Compliance Report',
        category: 'REPORTING',
        frequency: 'QUARTERLY',
        frequencyLabel: 'Quarterly (Q1 Due)',
        dueDayOfMonth: 15,
        dueMonths: [6], // July (month 6)
        statutoryDueDateText: '15th July (For Q1: April - June)',
        sebiRegulationRef: 'RAASB SOP & SEBI Master Circular for Research Analysts',
        penaltyAmountText: '₹100 per day delay after due date + disciplinary escalation',
        severity: 'MEDIUM',
        consequence: 'Late submission incurs statutory per-day late fees and triggers formal inquiry from BSE Administration & Supervision Ltd (BASL).',
        actionRequired: 'Submit Q1 compliance undertaking, client count, complaint summary, and fee collection figures through the BASL portal by July 15.'
    },
    {
        id: 'basl-quarterly-q2',
        ruleSrNo: 73,
        title: 'Q2 BASL / SEBI Quarterly Compliance Report',
        category: 'REPORTING',
        frequency: 'QUARTERLY',
        frequencyLabel: 'Quarterly (Q2 Due)',
        dueDayOfMonth: 15,
        dueMonths: [9], // October (month 9)
        statutoryDueDateText: '15th October (For Q2: July - September)',
        sebiRegulationRef: 'RAASB SOP & SEBI Master Circular for Research Analysts',
        penaltyAmountText: '₹100 per day delay after due date + disciplinary escalation',
        severity: 'MEDIUM',
        consequence: 'Late submission incurs statutory per-day late fees and flags entity on supervisory dashboard.',
        actionRequired: 'Submit Q2 compliance report, supervisory review, and client feedback summary via BASL portal by October 15.'
    },
    {
        id: 'basl-quarterly-q3',
        ruleSrNo: 73,
        title: 'Q3 BASL / SEBI Quarterly Compliance Report',
        category: 'REPORTING',
        frequency: 'QUARTERLY',
        frequencyLabel: 'Quarterly (Q3 Due)',
        dueDayOfMonth: 15,
        dueMonths: [0], // January (month 0)
        statutoryDueDateText: '15th January (For Q3: October - December)',
        sebiRegulationRef: 'RAASB SOP & SEBI Master Circular for Research Analysts',
        penaltyAmountText: '₹100 per day delay after due date + disciplinary escalation',
        severity: 'MEDIUM',
        consequence: 'Late fee accumulation and scrutiny of recommendation distribution channels.',
        actionRequired: 'Submit Q3 compliance return, DLT SMS verification logs, and grievance resolution figures on BASL portal by January 15.'
    },
    {
        id: 'basl-quarterly-q4',
        ruleSrNo: 73,
        title: 'Q4 BASL / SEBI Quarterly Compliance Report',
        category: 'REPORTING',
        frequency: 'QUARTERLY',
        frequencyLabel: 'Quarterly (Q4 Due)',
        dueDayOfMonth: 15,
        dueMonths: [3], // April (month 3)
        statutoryDueDateText: '15th April (For Q4: January - March)',
        sebiRegulationRef: 'RAASB SOP & SEBI Master Circular for Research Analysts',
        penaltyAmountText: '₹100 per day delay after due date + disciplinary escalation',
        severity: 'MEDIUM',
        consequence: 'Delayed annual closing reports trigger inspection and compliance desk audit.',
        actionRequired: 'Submit Q4 compliance return, complete annual data compilation, and upload BASL filing by April 15.'
    },
    {
        id: 'quarterly-networth-review',
        ruleSrNo: 6,
        title: 'Quarterly Net Worth & Capital Adequacy Maintenance',
        category: 'REGISTRATION',
        frequency: 'QUARTERLY',
        frequencyLabel: 'Quarterly (Every Quarter-End)',
        dueDayOfMonth: 30,
        dueMonths: [2, 5, 8, 11], // Mar, Jun, Sep, Dec
        statutoryDueDateText: 'End of Each Quarter (31 Mar, 30 Jun, 30 Sep, 31 Dec)',
        sebiRegulationRef: 'Regulation 8, SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: 'Immediate Suspension of License / Fit & Proper Disqualification',
        severity: 'HIGH',
        consequence: 'Operating below prescribed net worth (₹25L for individuals / ₹50L for body corporate) violates licensing criteria and results in summary suspension of services.',
        actionRequired: 'Ensure unencumbered net worth certificate is verified by CA at each quarter end. Maintain liquid assets or fixed deposits as prescribed.'
    },
    {
        id: 'annual-statutory-audit',
        ruleSrNo: 48,
        title: 'Annual Statutory Audit by Independent CA / CS',
        category: 'RECORDS_AUDIT',
        frequency: 'ANNUAL',
        frequencyLabel: 'Annual (By Sept 30)',
        dueDayOfMonth: 30,
        dueMonths: [8], // September (month 8)
        statutoryDueDateText: '30th September (Within 6 months of FY end)',
        sebiRegulationRef: 'Regulation 25(3), SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹25,000 Fine + De-registration / Suspension of License',
        severity: 'HIGH',
        consequence: 'Failure to submit the annual compliance audit report by CA/CS is considered a major governance violation leading to adjudication proceedings and suspension.',
        actionRequired: 'Appoint external CA/CS by June. Complete audit of all recommendations, client files, IT controls, and fee caps. Submit final certified audit report to SEBI/BASL by September 30.'
    },
    {
        id: 'half-yearly-internal-review',
        ruleSrNo: 15,
        title: 'Half-Yearly Internal Audit & Supervisory Review',
        category: 'GOVERNANCE',
        frequency: 'HALF_YEARLY',
        frequencyLabel: 'Half-Yearly (Sept 30 & March 31)',
        dueDayOfMonth: 30,
        dueMonths: [8, 2], // September & March
        statutoryDueDateText: '30th September & 31st March',
        sebiRegulationRef: 'Regulation 15(1), SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹25,000 per violation',
        severity: 'HIGH',
        consequence: 'Absence of supervisory controls or internal audit records exposes entity to high-risk audit flags and regulatory action.',
        actionRequired: 'Conduct internal sweep of research independence, conflict logs, employee personal trading records, and supervisory sign-offs.'
    },
    {
        id: 'annual-fee-networth-cert',
        ruleSrNo: 7,
        title: 'Annual Net Worth Certificate & BASL Membership Renewal',
        category: 'REGISTRATION',
        frequency: 'ANNUAL',
        frequencyLabel: 'Annual (By March 31)',
        dueDayOfMonth: 31,
        dueMonths: [2], // March (month 2)
        statutoryDueDateText: '31st March (Financial Year Close)',
        sebiRegulationRef: 'Schedule II, SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: 'De-registration & Invalidation of Recommendations',
        severity: 'HIGH',
        consequence: 'Default on annual membership fees or net worth certificate results in cancellation of membership and inability to publish research.',
        actionRequired: 'Obtain fresh CA Net Worth Certificate based on audited balance sheet and pay annual supervisory fees to BASL/SEBI before March 31.'
    },
    {
        id: 'daily-recommendation-timestamp',
        ruleSrNo: 32,
        title: 'Daily Trade Recommendation Rationale & Simultaneous Broadcast',
        category: 'CLIENT_OPS',
        frequency: 'DAILY',
        frequencyLabel: 'Daily (Every Recommendation)',
        statutoryDueDateText: 'Continuous / Daily Before Publication',
        sebiRegulationRef: 'Regulation 16 & 24, SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹10,000 per violation / Front-running Adjudication',
        severity: 'HIGH',
        consequence: 'Providing trade recommendations without recorded rationale or broadcasting to select clients ahead of others is treated as unfair market practice with heavy adjudication penalties.',
        actionRequired: 'Document research thesis, entry price, stop-loss, and target with timestamps. Broadcast simultaneously to all active subscribed clients across official channels.'
    },
    {
        id: 'daily-record-preservation',
        ruleSrNo: 43,
        title: 'Mandatory 5-Year Record Retention (Audio, Chats, Reports)',
        category: 'RECORDS_AUDIT',
        frequency: 'DAILY',
        frequencyLabel: 'Continuous Compliance (5 Years)',
        statutoryDueDateText: 'Ongoing (Minimum 5 Years from Creation)',
        sebiRegulationRef: 'Regulation 25(1) & (2), SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹10,000 to ₹25,000 per violation',
        severity: 'HIGH',
        consequence: 'Inability to produce recommendation logs, client interactions, or fee receipts during SEBI inspection leads to regulatory presumption of malpractice and severe penalties.',
        actionRequired: 'Maintain daily automated backups of all client communications, recommendation archives, payment receipts, and audit trail in secure read-only storage.'
    },
    {
        id: 'event-nism-renewal',
        ruleSrNo: 5,
        title: 'NISM Series-XV Certification Renewal',
        category: 'REGISTRATION',
        frequency: 'EVENT',
        frequencyLabel: 'Event-Based (Before 3-Yr Expiry)',
        statutoryDueDateText: 'Before 3-Year Certification Expiry',
        sebiRegulationRef: 'Regulation 7(2), SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: 'Immediate Ineligibility to issue recommendations / Suspension',
        severity: 'HIGH',
        consequence: 'Operating with expired NISM certification invalidates all issued recommendations and constitutes unlicensed advisory practice.',
        actionRequired: 'Track NISM Series-XV expiry date. Re-appear for examination or attend CPE (Continuing Professional Education) at least 3 months prior to expiry.'
    },
    {
        id: 'event-material-change',
        ruleSrNo: 72,
        title: 'SEBI Notification for Material Change / Control',
        category: 'REGISTRATION',
        frequency: 'EVENT',
        frequencyLabel: 'Event-Based (Within 15 Days)',
        statutoryDueDateText: 'Within 15 Days of Occurrence',
        sebiRegulationRef: 'Regulation 13, SEBI (Research Analysts) Regulations, 2014',
        penaltyAmountText: '₹25,000 per violation / Prior Approval Breach',
        severity: 'HIGH',
        consequence: 'Failure to seek prior approval or report change in partners/directors/address within 15 days triggers statutory penalty and license review.',
        actionRequired: 'Notify SEBI and BASL within 15 days of change in key managerial personnel, registered office, or ownership structure.'
    }
];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
export const SebiPenaltiesMatrixView = ({ onClose, isModal = false, onOpenChecklistCalendar }) => {
    const [activeViewMode, setActiveViewMode] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedSeverity, setSelectedSeverity] = useState('ALL');
    const [sortBy, setSortBy] = useState('srNo');
    const [sortOrder, setSortOrder] = useState('asc');
    // Calendar specific state
    const [calendarFilter, setCalendarFilter] = useState('ALL');
    const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
    const [selectedEventDetail, setSelectedEventDetail] = useState(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);
    // Table filter logic
    const filteredRules = useMemo(() => {
        return SEBI_PENALTIES_MASTER.filter(rule => {
            const q = searchTerm.toLowerCase().trim();
            const matchSearch = !q ||
                rule.srNo.toString().includes(q) ||
                rule.requirement.toLowerCase().includes(q) ||
                rule.frequency.toLowerCase().includes(q) ||
                rule.penalty.toLowerCase().includes(q);
            const matchCategory = selectedCategory === 'ALL' || rule.category === selectedCategory;
            const matchSeverity = selectedSeverity === 'ALL' || rule.severity === selectedSeverity;
            return matchSearch && matchCategory && matchSeverity;
        }).sort((a, b) => {
            if (sortBy === 'srNo') {
                return sortOrder === 'asc' ? a.srNo - b.srNo : b.srNo - a.srNo;
            }
            return sortOrder === 'asc'
                ? a.penalty.localeCompare(b.penalty)
                : b.penalty.localeCompare(a.penalty);
        });
    }, [searchTerm, selectedCategory, selectedSeverity, sortBy, sortOrder]);
    // Statistics
    const stats = useMemo(() => {
        const total = SEBI_PENALTIES_MASTER.length;
        const high = SEBI_PENALTIES_MASTER.filter(r => r.severity === 'HIGH').length;
        const medium = SEBI_PENALTIES_MASTER.filter(r => r.severity === 'MEDIUM').length;
        const low = SEBI_PENALTIES_MASTER.filter(r => r.severity === 'LOW').length;
        const recurring = SEBI_PENALTIES_MASTER.filter(r => r.penalty.includes('₹100') || r.penalty.includes('month') || r.penalty.includes('client')).length;
        return { total, high, medium, low, recurring };
    }, []);
    // Filter calendar events
    const filteredCalendarEvents = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        return SEBI_CALENDAR_SCHEDULE.filter(evt => {
            const matchSearch = !q ||
                evt.title.toLowerCase().includes(q) ||
                evt.sebiRegulationRef.toLowerCase().includes(q) ||
                evt.penaltyAmountText.toLowerCase().includes(q) ||
                evt.statutoryDueDateText.toLowerCase().includes(q) ||
                evt.ruleSrNo.toString().includes(q);
            const matchCategory = selectedCategory === 'ALL' || evt.category === selectedCategory;
            const matchSeverity = selectedSeverity === 'ALL' || evt.severity === selectedSeverity;
            const matchFrequency = calendarFilter === 'ALL' || evt.frequency === calendarFilter;
            return matchSearch && matchCategory && matchSeverity && matchFrequency;
        });
    }, [searchTerm, selectedCategory, selectedSeverity, calendarFilter]);
    // Calendar month days calculation
    const calendarMonthData = useMemo(() => {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        // Map scheduled events for this specific month
        const daysWithEvents = {};
        for (let d = 1; d <= totalDays; d++) {
            daysWithEvents[d] = [];
        }
        SEBI_CALENDAR_SCHEDULE.forEach(evt => {
            // Check if event applies to this month
            const appliesToThisMonth = !evt.dueMonths || evt.dueMonths.includes(month);
            if (appliesToThisMonth && evt.dueDayOfMonth && daysWithEvents[evt.dueDayOfMonth]) {
                daysWithEvents[evt.dueDayOfMonth].push(evt);
            }
        });
        return {
            year,
            month,
            firstDayIndex,
            totalDays,
            daysWithEvents
        };
    }, [currentCalendarDate]);
    // Export to CSV with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
    const handleExportCSV = () => {
        let headers = [];
        let rows = [];
        let fileName = '';
        if (activeViewMode === 'calendar') {
            fileName = `SEBI_Compliance_Calendar_Schedule_${Date.now()}.csv`;
            headers = [
                'Rule No',
                'Compliance Title',
                'Category',
                'Frequency',
                'Statutory Due Date',
                'SEBI Regulation Ref',
                'SEBI Penalty Exposure',
                'Risk Severity',
                'Action Required'
            ];
            rows = filteredCalendarEvents.map(evt => [
                evt.ruleSrNo,
                `"${(evt.title || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
                `"${evt.category}"`,
                `"${evt.frequencyLabel}"`,
                `"${evt.statutoryDueDateText}"`,
                `"${(evt.sebiRegulationRef || '').replace(/"/g, '""')}"`,
                `"${(evt.penaltyAmountText || '').replace(/"/g, '""')}"`,
                `"${evt.severity}"`,
                `"${(evt.actionRequired || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
            ]);
        }
        else {
            fileName = `SEBI_Penalties_Schedule_Reference_${Date.now()}.csv`;
            headers = [
                'Sr. No',
                'Compliance Requirement',
                'Category',
                'Compliance Frequency',
                'Related SEBI Penalty / Action',
                'Severity Risk'
            ];
            rows = filteredRules.map(r => [
                r.srNo,
                `"${(r.requirement || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
                `"${(r.category || '').replace(/_/g, ' ')}"`,
                `"${(r.frequency || '').replace(/"/g, '""')}"`,
                `"${(r.penalty || '').replace(/"/g, '""')}"`,
                `"${r.severity}"`
            ]);
        }
        const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
        // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel / WPS detects UTF-8 and correctly renders ₹ (Rupee) and special symbols
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    const getSeverityBadge = (rule) => {
        const text = rule.penalty;
        if (text.includes('₹25,000') || text.includes('₹20,000') || rule.severity === 'HIGH') {
            return (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0"/>
          {text}
        </span>);
        }
        if (text.includes('₹10,000') || rule.severity === 'MEDIUM') {
            return (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0"/>
          {text}
        </span>);
        }
        if (text.includes('₹5,000') || text.includes('₹1,000')) {
            return (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          <Clock className="h-3.5 w-3.5 shrink-0"/>
          {text}
        </span>);
        }
        if (text.includes('₹100')) {
            return (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          <DollarSign className="h-3.5 w-3.5 shrink-0"/>
          {text}
        </span>);
        }
        return (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
        {text}
      </span>);
    };
    const prevMonth = () => {
        setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };
    const resetToCurrentMonth = () => {
        setCurrentCalendarDate(new Date());
    };
    return (<div className={`space-y-6 ${isModal ? 'p-2' : ''}`}>
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-10 -mt-10 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold border border-primary-500/30 mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-primary-400"/>
              <span>Official SEBI Regulatory Reference Master</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">SEBI Penalties & Compliance Schedule</h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Complete reference matrix of all 78 SEBI (Research Analysts) Regulations, 2014 & RAASB clauses with exact penalty amounts, triggers, statutory deadlines, and compliance calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle: Table View vs Calendar View */}
            <div className="flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/15">
              <button type="button" onClick={() => setActiveViewMode('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeViewMode === 'table'
            ? 'bg-amber-400 text-slate-950 shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                <List className="h-3.5 w-3.5"/>
                <span>Table View (78 Rules)</span>
              </button>
              <button type="button" onClick={() => setActiveViewMode('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeViewMode === 'calendar'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
            : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                <CalendarIcon className="h-3.5 w-3.5"/>
                <span>Calendar View</span>
              </button>
            </div>

            {onOpenChecklistCalendar && (<button type="button" onClick={onOpenChecklistCalendar} className="px-3 py-2 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-400/30 shadow-sm" title="Open Live Audit Checklist Calendar">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-200"/>
                <span>Live Audit Calendar</span>
              </button>)}

            <button onClick={handleExportCSV} className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10 shadow-sm" title="Download Excel / CSV">
              <Download className="h-3.5 w-3.5"/>
              <span>Export CSV</span>
            </button>

            {onClose && (<button onClick={onClose} className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md active:scale-95" title="Return to Checklist Tasks">
                <ArrowUpDown className="h-3.5 w-3.5 rotate-90"/>
                <span>Back to Checklist</span>
              </button>)}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Rules</span>
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">100% Coverage</span>
          </div>
          <div className="bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
            <span className="text-[10px] text-rose-300 font-semibold uppercase tracking-wider block">Max ₹20k - ₹25k</span>
            <span className="text-2xl font-black text-rose-400">{stats.high}</span>
            <span className="text-[10px] text-rose-300/80 block mt-0.5">Audits & Governance</span>
          </div>
          <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
            <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider block">₹10,000 Violations</span>
            <span className="text-2xl font-black text-amber-400">{stats.medium}</span>
            <span className="text-[10px] text-amber-300/80 block mt-0.5">Independence / Front-run</span>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
            <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider block">Standard ₹5,000</span>
            <span className="text-2xl font-black text-blue-400">{stats.low}</span>
            <span className="text-[10px] text-blue-300/80 block mt-0.5">Filings & Website</span>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider block">Per-Client / Day</span>
            <span className="text-2xl font-black text-purple-400">{stats.recurring}</span>
            <span className="text-[10px] text-purple-300/80 block mt-0.5">ATR Delay & Limits</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
          <input type="text" placeholder={activeViewMode === 'table' ? "Search by requirement, keyword (e.g. ₹10,000, audit, client)..." : "Search compliance calendar deadlines & penalties..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"/>
          {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white">
              Clear
            </button>)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Frequency Filter (only shown in Calendar View) */}
          {activeViewMode === 'calendar' && (<select value={calendarFilter} onChange={(e) => setCalendarFilter(e.target.value)} className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="ALL">All Frequencies</option>
              <option value="MONTHLY">Monthly Deadlines (By 7th/10th)</option>
              <option value="QUARTERLY">Quarterly Reports (15th)</option>
              <option value="HALF_YEARLY">Half-Yearly Audits (Sept/March)</option>
              <option value="ANNUAL">Annual Milestones (Sept 30 / Mar 31)</option>
              <option value="DAILY">Daily / Continuous Guardrails</option>
              <option value="EVENT">Event-Based (NISM / Changes)</option>
            </select>)}

          {/* Severity Filter */}
          <select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ALL">All Severity Levels</option>
            <option value="HIGH">High (₹20,000 - ₹25,000 / Disqualification)</option>
            <option value="MEDIUM">Medium (₹10,000 Violations)</option>
            <option value="LOW">Low (₹5,000 / ₹1,000 Standard)</option>
          </select>

          {/* Category Filter */}
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ALL">All Categories</option>
            <option value="REGISTRATION">Registration & NISM</option>
            <option value="GOVERNANCE">Governance & Policies</option>
            <option value="CODE_OF_CONDUCT">Code of Conduct & Trading</option>
            <option value="DISCLOSURES">Disclosures & Transparency</option>
            <option value="RECORDS_AUDIT">Audit & Record Keeping</option>
            <option value="CLIENT_OPS">Client Operations & Fees</option>
            <option value="REPORTING">Reporting & Regulatory Filings</option>
          </select>

          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2">
            Showing <strong className="text-slate-900 dark:text-white">
              {activeViewMode === 'table' ? filteredRules.length : filteredCalendarEvents.length}
            </strong> {activeViewMode === 'table' ? `of ${stats.total}` : 'schedules'}
          </span>
        </div>
      </div>

      {/* =========================================================================
            VIEW 1: TABLE VIEW (Official 78 Rules Matrix)
        ========================================================================= */}
      {activeViewMode === 'table' && (<div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/95 backdrop-blur z-10 border-b border-slate-200 dark:border-white/10">
                <tr className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-4 w-16 text-center">Sr.</th>
                  <th className="py-3 px-4">Compliance Requirement</th>
                  <th className="py-3 px-4 w-48">Compliance Frequency</th>
                  <th className="py-3 px-4 min-w-[260px]">Related Penalty / Regulatory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs">
                {filteredRules.length === 0 ? (<tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      No compliance requirements found matching "{searchTerm}".
                    </td>
                  </tr>) : (filteredRules.map((rule) => (<tr key={rule.srNo} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {rule.srNo}
                      </td>
                      <td className="py-3.5 px-4 pr-6">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {rule.requirement}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {rule.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0"/>
                          {rule.frequency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getSeverityBadge(rule)}
                      </td>
                    </tr>)))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* =========================================================================
            VIEW 2: CALENDAR VIEW (Regulatory Deadlines & Penalty Exposure Schedule)
        ========================================================================= */}
      {activeViewMode === 'calendar' && (<div className="space-y-6">
          {/* Calendar Month Navigation Header */}
          <div className="glassmorphism rounded-2xl p-5 border border-slate-300 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <CalendarIcon className="h-5 w-5"/>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{MONTH_NAMES[calendarMonthData.month]} {calendarMonthData.year}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
                    (FY {calendarMonthData.month >= 3 ? `${calendarMonthData.year}-${calendarMonthData.year + 1}` : `${calendarMonthData.year - 1}-${calendarMonthData.year}`})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SEBI compliance milestones, statutory due dates, and non-compliance penalty exposure.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={prevMonth} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition" title="Previous Month">
                <ChevronLeft className="h-4 w-4"/>
              </button>
              <button type="button" onClick={resetToCurrentMonth} className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition">
                Today
              </button>
              <button type="button" onClick={nextMonth} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition" title="Next Month">
                <ChevronRight className="h-4 w-4"/>
              </button>
            </div>
          </div>

          {/* Interactive Month Grid */}
          <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 overflow-hidden shadow-sm p-4">
            <div className="grid grid-cols-7 gap-2 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (<div key={d} className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-1">
                  {d}
                </div>))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Blank cells before start of month */}
              {Array.from({ length: calendarMonthData.firstDayIndex }).map((_, idx) => (<div key={`blank-${idx}`} className="h-24 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-transparent opacity-40"></div>))}

              {/* Month Days */}
              {Array.from({ length: calendarMonthData.totalDays }).map((_, idx) => {
                const day = idx + 1;
                const eventsOnThisDay = calendarMonthData.daysWithEvents[day] || [];
                const hasEvents = eventsOnThisDay.length > 0;
                const isSelected = selectedDayEvents?.day === day;
                return (<div key={`day-${day}`} onClick={() => {
                        if (hasEvents) {
                            setSelectedDayEvents({ day, events: eventsOnThisDay });
                        }
                        else {
                            setSelectedDayEvents(null);
                        }
                    }} className={`min-h-[105px] p-2.5 rounded-xl border transition flex flex-col justify-between text-left cursor-pointer ${isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-500/20 shadow-md ring-2 ring-indigo-500/40'
                        : hasEvents
                            ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-400/[0.08] hover:bg-amber-100/80 dark:hover:bg-amber-400/15 hover:border-amber-400 shadow-xs'
                            : 'border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black font-mono ${hasEvents ? 'text-amber-950 dark:text-amber-300' : 'text-slate-800 dark:text-slate-300'}`}>
                        {day}
                      </span>
                      {hasEvents && (<span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                          {eventsOnThisDay.length} Due
                        </span>)}
                    </div>

                    {hasEvents ? (<div className="space-y-1.5 overflow-hidden mt-1.5">
                        {eventsOnThisDay.slice(0, 2).map(e => (<div key={e.id} className={`text-[10px] font-bold px-2 py-1 rounded-lg truncate border shadow-xs transition ${e.severity === 'HIGH'
                                ? 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-500/40'
                                : 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-500/40'}`} title={`${e.title} - Penalty: ${e.penaltyAmountText}`}>
                            <span className="font-mono mr-1">#{e.ruleSrNo}</span>
                            <span>{e.title}</span>
                          </div>))}
                        {eventsOnThisDay.length > 2 && (<div className="text-[9px] text-slate-600 dark:text-slate-400 font-bold font-mono pl-1">
                            +{eventsOnThisDay.length - 2} more
                          </div>)}
                      </div>) : (<div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Routine</div>)}
                  </div>);
            })}
            </div>
          </div>

          {/* Selected Day Event Drawer / Callout */}
          {selectedDayEvents && (<div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-gradient-to-r dark:from-amber-500/10 dark:via-indigo-500/10 dark:to-amber-500/10 border border-amber-300 dark:border-amber-400/30 shadow-md animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs font-mono">
                    {MONTH_NAMES[calendarMonthData.month]} {selectedDayEvents.day}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Compliance Deadlines Due on this Date ({selectedDayEvents.events.length})
                  </h4>
                </div>
                <button type="button" onClick={() => setSelectedDayEvents(null)} className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayEvents.events.map(evt => (<div key={evt.id} onClick={() => setSelectedEventDetail(evt)} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 hover:border-amber-500 transition cursor-pointer shadow-sm group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400">
                          SEBI Rule #{evt.ruleSrNo} • {evt.category}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition mt-0.5">
                          {evt.title}
                        </h5>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${evt.severity === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                        : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'}`}>
                        {evt.severity} RISK
                      </span>
                    </div>

                    <div className="mt-2.5 p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-[11px] text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-600 shrink-0"/>
                      <span>Non-Compliance Penalty: {evt.penaltyAmountText}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{evt.sebiRegulationRef}</span>
                      <span className="text-primary-600 dark:text-primary-400 font-bold group-hover:underline flex items-center gap-1">
                        View Details <ArrowRight className="h-3 w-3"/>
                      </span>
                    </div>
                  </div>))}
              </div>
            </div>)}

          {/* Master Timeline Schedules (All Deadlines & Recurring Timelines) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Regulatory Deadlines &amp; Penalty Exposure Timeline
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed statutory schedule with non-compliance legal consequences and mandatory actions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCalendarEvents.map(evt => (<div key={evt.id} onClick={() => setSelectedEventDetail(evt)} className="glassmorphism p-4 rounded-2xl border border-slate-300 dark:border-white/10 hover:border-amber-400/80 dark:hover:border-amber-400/60 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group flex flex-col justify-between">
                  <div>
                    {/* Header: Rule number & Frequency */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Rule #{evt.ruleSrNo}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${evt.severity === 'HIGH'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                    : evt.severity === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        : 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30'}`}>
                        {evt.severity}
                      </span>
                    </div>

                    {/* Title */}
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition mt-2 leading-snug">
                      {evt.title}
                    </h5>

                    {/* Statutory Due Date */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0"/>
                      <span>{evt.statutoryDueDateText}</span>
                    </div>

                    {/* SEBI Penalty Callout Box */}
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25">
                      <div className="text-[9px] uppercase font-black tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3 shrink-0"/>
                        SEBI Penalty Exposure
                      </div>
                      <p className="text-xs font-black text-rose-900 dark:text-rose-200 mt-0.5">
                        {evt.penaltyAmountText}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {evt.actionRequired}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[180px]">{evt.sebiRegulationRef}</span>
                    <span className="text-primary-600 dark:text-primary-400 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                      Details <ArrowRight className="h-3 w-3"/>
                    </span>
                  </div>
                </div>))}
            </div>
          </div>
        </div>)}

      {/* =========================================================================
            EVENT DETAIL MODAL
        ========================================================================= */}
      {selectedEventDetail && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                    SEBI Rule #{selectedEventDetail.ruleSrNo}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {selectedEventDetail.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedEventDetail.title}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedEventDetail(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition">
                <X className="h-5 w-5"/>
              </button>
            </div>

            {/* Timing & Regulation */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Statutory Due Date:</span>
                <strong className="text-slate-900 dark:text-white">{selectedEventDetail.statutoryDueDateText}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Regulation Reference:</span>
                <span className="text-slate-700 dark:text-slate-300 text-right">{selectedEventDetail.sebiRegulationRef}</span>
              </div>
            </div>

            {/* Penalty Highlight */}
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 shrink-0"/>
                Related Penalty / Enforcement Action
              </span>
              <p className="text-sm font-black text-rose-900 dark:text-rose-200 mt-1">
                {selectedEventDetail.penaltyAmountText}
              </p>
              <p className="text-xs text-rose-800 dark:text-rose-300/90 mt-1 leading-relaxed">
                {selectedEventDetail.consequence}
              </p>
            </div>

            {/* Action Required */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Mandatory Compliance Action:
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                {selectedEventDetail.actionRequired}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setSelectedEventDetail(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition">
                Close
              </button>
              {onOpenChecklistCalendar && (<button type="button" onClick={() => {
                    setSelectedEventDetail(null);
                    onOpenChecklistCalendar();
                }} className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition">
                  Verify in Checklist
                </button>)}
            </div>
          </div>
        </div>)}

      {/* Footer / Helper Note for Admin */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5"/>
        <div className="leading-relaxed">
          <strong className="text-slate-900 dark:text-white">Admin Regulatory Understanding Note:</strong> Penalties listed above are specified under SEBI Circulars, RAASB Standard Operating Procedures, and Chapter V (General Obligations) of SEBI (Research Analysts) Regulations, 2014. Repeated violations escalate fines (e.g. from second instance onwards) and may lead to suspension or de-registration of the Research Analyst licence. Use the Calendar View to anticipate and execute statutory filings ahead of due dates.
        </div>
      </div>
    </div>);
};
