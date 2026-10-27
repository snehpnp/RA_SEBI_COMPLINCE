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

// 1. Extract imports and helpers (lines 1 to 589)
const topLines = lines.slice(0, 589).join('\n');
const cleanTop = transpileCode(topLines);

// 2. Extract state and methods inside AdminDashboard (lines 589 to 5519)
const bodyLines = lines.slice(589, 5519).join('\n');
const cleanBody = transpileCode(bodyLines);

// Find all defined variables to export in context
const varMatches = new Set();
const stateRegex = /const\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]/g;
let m;
while ((m = stateRegex.exec(bodyLines)) !== null) {
  varMatches.add(m[1]);
  varMatches.add(m[2]);
}
const funcRegex = /(?:const|function)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:async\s*)?(?:\(function|\()/g;
while ((m = funcRegex.exec(bodyLines)) !== null) {
  varMatches.add(m[1]);
}
const refRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*useRef/g;
while ((m = refRegex.exec(bodyLines)) !== null) {
  varMatches.add(m[1]);
}

// Modals state variables from lines 17040 to 18080 that need to be in context
const modalsState = `
  // Modals & Popups State
  const [closingAlertId, setClosingAlertId] = useState(null);
  const [depositTopup, setDepositTopup] = useState('');
  const [alertProof, setAlertProof] = useState(null);
  const [closeRemarks, setCloseRemarks] = useState('');
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineClient, setSelectedTimelineClient] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportHalf, setReportHalf] = useState('H1');
  const [reportStartYear, setReportStartYear] = useState(2023);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [showClientNotFoundAlert, setShowClientNotFoundAlert] = useState(false);
  const [complaintFoundClient, setComplaintFoundClient] = useState(null);
  const [isManualFillAllowed, setIsManualFillAllowed] = useState(false);
  const [pdfPreviewModal, setPdfPreviewModal] = useState(null);
  const [isGstConfirmModalOpen, setIsGstConfirmModalOpen] = useState(false);
  const [isKycFlowConfirmModalOpen, setIsKycFlowConfirmModalOpen] = useState(false);
  const [isSetupPrereqModalOpen, setIsSetupPrereqModalOpen] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [auditModalReq, setAuditModalReq] = useState(null);
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
`;

const extraVars = [
  'closingAlertId', 'setClosingAlertId', 'depositTopup', 'setDepositTopup',
  'alertProof', 'setAlertProof', 'closeRemarks', 'setCloseRemarks',
  'confirmState', 'setConfirmState', 'isTimelineModalOpen', 'setIsTimelineModalOpen',
  'selectedTimelineClient', 'setSelectedTimelineClient', 'showReportModal', 'setShowReportModal',
  'reportYear', 'setReportYear', 'reportHalf', 'setReportHalf', 'reportStartYear', 'setReportStartYear',
  'isComplaintModalOpen', 'setIsComplaintModalOpen', 'showClientNotFoundAlert', 'setShowClientNotFoundAlert',
  'complaintFoundClient', 'setComplaintFoundClient', 'isManualFillAllowed', 'setIsManualFillAllowed',
  'pdfPreviewModal', 'setPdfPreviewModal', 'isGstConfirmModalOpen', 'setIsGstConfirmModalOpen',
  'isKycFlowConfirmModalOpen', 'setIsKycFlowConfirmModalOpen', 'isSetupPrereqModalOpen', 'setIsSetupPrereqModalOpen',
  'showCalendarModal', 'setShowCalendarModal', 'auditModalReq', 'setAuditModalReq',
  'isGoLiveModalOpen', 'setIsGoLiveModalOpen', 'isLogoutModalOpen', 'setIsLogoutModalOpen',
  'NAV_CONFIG', 'ICON_MAP', 'formatAlertDescription'
];

extraVars.forEach(v => varMatches.add(v));

// Build context value object
const allVarsList = Array.from(varMatches).filter(v => v !== 's' && v !== 'props' && v !== 'router');

const adminContextContent = `import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from '@/utils/nextCompat';
import { useBranding } from '@/contexts/BrandingContext';
import { useStates } from '@/hooks/useStates';
import { useCities } from '@/hooks/useCities';
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

${cleanTop}

export function AdminProvider({ children }) {
  const router = useRouter();
  const { branding, appName, logoUrl: appLogo } = useBranding();
  const { states } = useStates();

  ${cleanBody}

  ${modalsState}

  const contextValue = {
    ${allVarsList.join(',\n    ')}
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
`;

fs.writeFileSync(path.join(outDir, 'AdminContext.jsx'), adminContextContent, 'utf-8');
console.log('AdminContext.jsx generated successfully!');
