'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder,
  FolderArchive,
  FileText,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Search,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Shield,
  PhoneCall,
  History,
  Grid,
  List,
  ExternalLink,
  Volume2,
  TrendingUp,
  CreditCard,
  FileCheck,
  Check,
  X,
  Plus,
  Calendar,
  FileDown,
  FileSearch,
  AlertTriangle,
  Receipt,
  Sparkles,
  Copy,
  Mic,
  MicOff,
  MessageSquare
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'react-hot-toast';

// Helper to resolve media URLs to full backend URLs
const resolveMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() || '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${cleanPath}`;
};

// Helper to highlight detected keywords inside chat bubble text
const highlightProhibitedWords = (text: string, detectedKeywords: any[] = []) => {
  if (!text) return '';
  if (!detectedKeywords || detectedKeywords.length === 0) return text;

  let res = text;
  for (const item of detectedKeywords) {
    const kw = typeof item === 'string' ? item : item.keyword;
    if (!kw) continue;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isDevanagari = /[\u0900-\u097F]/.test(kw);
    const regex = isDevanagari
      ? new RegExp(`(${escaped})`, 'gi')
      : new RegExp(`(\\b${escaped}\\b)`, 'gi');
    res = res.replace(
      regex,
      `<mark class="bg-rose-600 text-white font-black px-1.5 py-0.5 rounded shadow-xs" title="SEBI Prohibited Term">$1</mark>`
    );
  }
  return res;
};

// Helper to generate role-based conversation turns
const generateClientTurns = (text: string, staffName?: string, clientName?: string) => {
  if (!text || !text.trim()) return [];
  const sName = staffName || 'Advisory Executive';
  const cName = clientName || 'Client';

  if (/(Executive|Staff|Client|Investor|Advisor):/i.test(text)) {
    const lines = text.split(/\n+/).filter(l => l.trim().length > 0);
    return lines.map((line, idx) => {
      let sp: 'EXECUTIVE' | 'CLIENT' = idx % 2 === 0 ? 'EXECUTIVE' : 'CLIENT';
      let name = sp === 'EXECUTIVE' ? sName : cName;
      let cleanText = line.trim();
      if (/^(Client|Investor):/i.test(cleanText)) {
        sp = 'CLIENT';
        name = cName;
        cleanText = cleanText.replace(/^(Client|Investor):\s*/i, '');
      } else if (/^(Executive|Staff|Advisor):/i.test(cleanText)) {
        sp = 'EXECUTIVE';
        name = sName;
        cleanText = cleanText.replace(/^(Executive|Staff|Advisor):\s*/i, '');
      }
      return {
        speaker: sp,
        speakerName: name,
        text: cleanText,
        timestamp: `00:${(idx * 8).toString().padStart(2, '0')}`
      };
    });
  }

  // Split into alternating dialogue turns
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map((sent, idx) => {
    const isExec = idx % 2 === 0;
    return {
      speaker: (isExec ? 'EXECUTIVE' : 'CLIENT') as 'EXECUTIVE' | 'CLIENT',
      speakerName: isExec ? sName : cName,
      text: sent.trim(),
      timestamp: `00:${(idx * 6).toString().padStart(2, '0')}`
    };
  });
};

interface ClientVaultItem {
  clientId: string;
  name: string;
  mobile: string;
  email: string;
  pan?: string;
  category: string;
  status: string;
  planStatus?: 'ACTIVE_PLAN' | 'EXPIRED_PLAN' | 'NO_PLAN';
  activePlanNames?: string[];
  registeredAt: string;
  registeredAtFormatted?: string;
  folderName: string;
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    documentsCount: number;
    recordingsCount: number;
    agreementsCount: number;
    totalFilesEstimated: number;
  };
}

interface VaultDetails {
  client: any;
  folderName: string;
  folders: {
    basicProfile: any;
    subscriptions: any;
    tradeSignals: any;
    researchReports: any;
    kycDocuments: any;
    agreements: any;
    callRecordings: any;
    auditTrail: any;
  };
}

const SUBFOLDER_METADATA: Record<string, {
  icon: any;
  number: string;
  badge: string;
  gradient: string;
  borderHover: string;
  badgeBg: string;
  titleColor: string;
  headerBg: string;
  formatText: string;
}> = {
  '01_Basic_Profile': {
    icon: User,
    number: '01',
    badge: 'Profile & KYC',
    gradient: 'from-blue-600 to-indigo-600',
    borderHover: 'hover:border-blue-500 hover:shadow-blue-500/10',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    titleColor: 'text-blue-600 dark:text-blue-400',
    headerBg: 'bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40',
    formatText: 'Client Dossier (.xlsx)'
  },
  '02_Subscriptions_&_Invoices': {
    icon: CreditCard,
    number: '02',
    badge: 'Plans & Tax Invoices',
    gradient: 'from-emerald-600 to-teal-600',
    borderHover: 'hover:border-emerald-500 hover:shadow-emerald-500/10',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    titleColor: 'text-emerald-600 dark:text-emerald-400',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40',
    formatText: 'Tax Invoices (PDF) + Ledger (.xlsx)'
  },
  '03_Trade_Signals': {
    icon: TrendingUp,
    number: '03',
    badge: 'Signals & P&L',
    gradient: 'from-violet-600 to-indigo-600',
    borderHover: 'hover:border-violet-500 hover:shadow-violet-500/10',
    badgeBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    titleColor: 'text-violet-600 dark:text-violet-400',
    headerBg: 'bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-900/40',
    formatText: 'Signals & P&L Ledger (.xlsx)'
  },
  '04_Research_Reports': {
    icon: FileText,
    number: '04',
    badge: 'SEBI Research',
    gradient: 'from-amber-500 to-orange-600',
    borderHover: 'hover:border-amber-500 hover:shadow-amber-500/10',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    titleColor: 'text-amber-600 dark:text-amber-400',
    headerBg: 'bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40',
    formatText: 'Research Reports (PDF) + Index'
  },
  '05_KYC_Documents': {
    icon: Shield,
    number: '05',
    badge: 'Identity & CKYC',
    gradient: 'from-cyan-600 to-blue-600',
    borderHover: 'hover:border-cyan-500 hover:shadow-cyan-500/10',
    badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    titleColor: 'text-cyan-600 dark:text-cyan-400',
    headerBg: 'bg-cyan-50 dark:bg-cyan-950/40 border-b border-cyan-100 dark:border-cyan-900/40',
    formatText: 'KYC Proof Files (PDF/Img) + Index'
  },
  '06_Signed_Agreements': {
    icon: FileCheck,
    number: '06',
    badge: 'SEBI RA Legal',
    gradient: 'from-indigo-600 to-purple-600',
    borderHover: 'hover:border-indigo-500 hover:shadow-indigo-500/10',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    titleColor: 'text-indigo-600 dark:text-indigo-400',
    headerBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40',
    formatText: 'Signed Service Agreement (PDF)'
  },
  '07_Call_Recordings': {
    icon: PhoneCall,
    number: '07',
    badge: 'Service Audios',
    gradient: 'from-rose-500 to-pink-600',
    borderHover: 'hover:border-rose-500 hover:shadow-rose-500/10',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    titleColor: 'text-rose-600 dark:text-rose-400',
    headerBg: 'bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/40',
    formatText: 'Audio Recordings (.mp3) + Index'
  },
  '08_Audit_Trail': {
    icon: History,
    number: '08',
    badge: 'Compliance Logs',
    gradient: 'from-slate-700 to-slate-900',
    borderHover: 'hover:border-slate-500 hover:shadow-slate-500/10',
    badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    titleColor: 'text-slate-700 dark:text-slate-300',
    headerBg: 'bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800',
    formatText: 'Compliance Activity Logs (.xlsx)'
  }
};

interface ClientVaultExplorerProps {
  canDownload?: boolean;
  isMasked?: boolean;
}

const maskMobile = (val?: string) => {
  if (!val) return 'N/A';
  if (val.includes('*')) return val;
  const clean = val.replace(/\D/g, '');
  if (clean.length < 4) return '******' + clean;
  return clean.substring(0, 4) + '****' + clean.substring(clean.length - 2);
};

const maskEmail = (val?: string) => {
  if (!val) return 'N/A';
  if (val.includes('*')) return val;
  const parts = val.split('@');
  if (parts.length !== 2) return '***@***.com';
  const name = parts[0];
  const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
  return `${maskedName}@${parts[1]}`;
};

const maskPan = (val?: string) => {
  if (!val) return 'N/A';
  if (val.includes('*')) return val;
  const clean = val.trim();
  if (clean.length <= 4) return '****';
  return clean.substring(0, 2) + '*'.repeat(clean.length - 4) + clean.substring(clean.length - 2);
};

export default function ClientVaultExplorer({ canDownload: propCanDownload, isMasked: propIsMasked }: ClientVaultExplorerProps = {}) {
  // Navigation states: 'ROOT' | 'CLIENT' | 'SUBFOLDER'
  const [navLevel, setNavLevel] = useState<'ROOT' | 'CLIENT' | 'SUBFOLDER'>('ROOT');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSubfolderKey, setSelectedSubfolderKey] = useState<string | null>(null);

  // Dynamic RBAC Permission & Masking state (synced with backend & props)
  const [serverCanDownload, setServerCanDownload] = useState<boolean>(true);
  const [serverIsMasked, setServerIsMasked] = useState<boolean>(false);

  const effectiveCanDownload = propCanDownload !== false && serverCanDownload !== false;
  const effectiveIsMasked = Boolean(propIsMasked) || Boolean(serverIsMasked);

  // Filter state: 'ALL' | 'ACTIVE' | 'EXPIRED' | 'NO_PLAN'
  const [planStatusFilter, setPlanStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'NO_PLAN'>('ALL');

  // Data states
  const [vaults, setVaults] = useState<ClientVaultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [vaultDetails, setVaultDetails] = useState<VaultDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio recording upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPurpose, setUploadPurpose] = useState('');
  const [uploadStaffName, setUploadStaffName] = useState('');
  const [uploadCallDate, setUploadCallDate] = useState(() => new Date().toISOString().substring(0, 16));
  const [uploadDuration, setUploadDuration] = useState('0');
  const [uploadSummary, setUploadSummary] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Audio player state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording Review & Words Scanner Modal
  const [selectedReviewRecording, setSelectedReviewRecording] = useState<any | null>(null);
  const [reviewTranscriptText, setReviewTranscriptText] = useState<string>('');
  const [reviewScanResult, setReviewScanResult] = useState<any | null>(null);
  const [reviewConversationTurns, setReviewConversationTurns] = useState<any[]>([]);
  const [conversationTab, setConversationTab] = useState<'chat' | 'editor'>('chat');
  const [isScanningTranscript, setIsScanningTranscript] = useState<boolean>(false);
  const [isAutoTranscribing, setIsAutoTranscribing] = useState<boolean>(false);
  const [reviewAudioDuration, setReviewAudioDuration] = useState<number>(0);
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);

  const handleAutoTranscribeFile = async () => {
    if (!selectedReviewRecording || !selectedClientId) return;
    try {
      setIsAutoTranscribing(true);
      toast.loading('Converting audio file speech to text...', { id: 'transcribe-load' });
      const res = await api.autoTranscribeCallRecording(selectedClientId, selectedReviewRecording._id);
      if (res && res.success && res.data) {
        toast.dismiss('transcribe-load');
        setReviewScanResult(res.data.scan);
        setReviewTranscriptText(res.data.transcribedText || '');
        if (res.data.conversationTurns && res.data.conversationTurns.length > 0) {
          setReviewConversationTurns(res.data.conversationTurns);
        } else {
          setReviewConversationTurns(generateClientTurns(res.data.transcribedText, selectedReviewRecording.callerStaffName, vaultDetails?.client?.name));
        }
        if (res.data.recording?.durationSeconds) {
          setReviewAudioDuration(res.data.recording.durationSeconds);
        }
        if (res.data.scan?.isFlagged) {
          toast.error(`⚠️ ${res.data.scan.flaggedCount} SEBI prohibited word(s) detected in audio!`);
        } else {
          toast.success('Speech transcribed! No prohibited words detected.');
        }
        openClientVault(selectedClientId);
      } else {
        toast.error(res?.message || 'Speech-to-text failed', { id: 'transcribe-load' });
      }
    } catch (err: any) {
      toast.error('Transcription error: ' + (err.message || 'Error'), { id: 'transcribe-load' });
    } finally {
      setIsAutoTranscribing(false);
    }
  };

  // Automatically detect duration when audio file is chosen
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
    if (file) {
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            const dur = Math.round(audio.duration);
            setUploadDuration(String(dur));
          }
          URL.revokeObjectURL(objectUrl);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (err) {
        console.warn('Could not read audio duration', err);
      }
    }
  };

  // Browser Speech-to-Text handler
  const handleStartSpeechToText = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        toast('Listening to speech... You can speak or play the recording now.', { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        if (transcript.trim()) {
          setReviewTranscriptText(transcript.trim());
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err.error);
        setIsListeningSpeech(false);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
      };

      (window as any)._vaultRecognition = recognition;
      recognition.start();
    } catch (e: any) {
      console.error(e);
      setIsListeningSpeech(false);
      toast.error('Could not activate microphone');
    }
  };

  const handleStopSpeechToText = () => {
    if ((window as any)._vaultRecognition) {
      try {
        (window as any)._vaultRecognition.stop();
      } catch (e) {}
    }
    setIsListeningSpeech(false);
    toast.success('Speech capture stopped');
  };

  const handleScanTranscript = async (customText?: string) => {
    if (!selectedReviewRecording || !selectedClientId) return;
    try {
      setIsScanningTranscript(true);
      const textToScan = customText !== undefined ? customText : reviewTranscriptText;
      const res = await api.scanCallRecordingTranscript(selectedClientId, selectedReviewRecording._id, textToScan);
      if (res && res.success && res.data) {
        setReviewScanResult(res.data.scan);
        setReviewTranscriptText(textToScan);
        if (res.data.conversationTurns && res.data.conversationTurns.length > 0) {
          setReviewConversationTurns(res.data.conversationTurns);
        } else {
          setReviewConversationTurns(generateClientTurns(textToScan, selectedReviewRecording.callerStaffName, vaultDetails?.client?.name));
        }
        toast.success(res.data.scan.isFlagged ? `Scan complete: ${res.data.scan.flaggedCount} prohibited word(s) detected!` : 'Scan complete: No prohibited words detected.');
        openClientVault(selectedClientId);
      } else {
        toast.error(res?.message || 'Scan failed');
      }
    } catch (err: any) {
      toast.error('Scan error: ' + (err.message || 'Error'));
    } finally {
      setIsScanningTranscript(false);
    }
  };

  const openRecordingReview = (rec: any) => {
    setSelectedReviewRecording(rec);
    setReviewAudioDuration(rec.durationSeconds || 0);
    setConversationTab('chat');
    const initialText = rec.transcriptText || rec.summary || rec.title || '';
    setReviewTranscriptText(initialText);

    if (rec.conversationTurns && rec.conversationTurns.length > 0) {
      setReviewConversationTurns(rec.conversationTurns);
    } else {
      setReviewConversationTurns(generateClientTurns(initialText, rec.callerStaffName, vaultDetails?.client?.name));
    }

    if (selectedClientId) {
      api.scanCallRecordingTranscript(selectedClientId, rec._id, initialText).then((res: any) => {
        if (res && res.success && res.data) {
          setReviewScanResult(res.data.scan);
          if (res.data.conversationTurns && res.data.conversationTurns.length > 0) {
            setReviewConversationTurns(res.data.conversationTurns);
          }
        }
      }).catch(() => {});
    }
  };

  // Trade signals filter in subfolder view
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED' | 'TARGET_HIT' | 'SL_HIT'>('ALL');

  // Load vaults list
  const loadVaults = async () => {
    try {
      setLoading(true);
      const res = await api.getClientVaults({
        search: searchQuery,
        planStatusFilter: planStatusFilter !== 'ALL' ? planStatusFilter : undefined
      });
      if (res && res.success) {
        setVaults(res.data || []);
        if (res.canDownload !== undefined) setServerCanDownload(res.canDownload);
        if (res.isMasked !== undefined) setServerIsMasked(res.isMasked);
      } else {
        toast.error(res?.message || 'Failed to load client vaults');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error loading client vaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaults();
  }, [planStatusFilter]);

  // Debounced search on root view
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navLevel === 'ROOT') {
        loadVaults();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load client vault details when opening a client folder
  const openClientVault = async (clientId: string) => {
    try {
      setSelectedClientId(clientId);
      setDetailsLoading(true);
      setNavLevel('CLIENT');
      setSelectedSubfolderKey(null);
      const res = await api.getClientVaultDetails(clientId);
      if (res && res.success) {
        setVaultDetails(res.data);
        if (res.data?.canDownload !== undefined) setServerCanDownload(res.data.canDownload);
        else if (res.canDownload !== undefined) setServerCanDownload(res.canDownload);

        if (res.data?.isMasked !== undefined) setServerIsMasked(res.data.isMasked);
        else if (res.isMasked !== undefined) setServerIsMasked(res.isMasked);
      } else {
        toast.error(res?.message || 'Could not load vault details');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error loading vault');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Refresh vault details without kicking user out of current subfolder
  const refreshVaultKeepFolder = async (clientId: string) => {
    try {
      const res = await api.getClientVaultDetails(clientId);
      if (res && res.success) {
        setVaultDetails(res.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Multi-select state for Call Recordings
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelectRecording = (id: string) => {
    setSelectedRecordingIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (allIds: string[]) => {
    if (selectedRecordingIds.length === allIds.length) {
      setSelectedRecordingIds([]);
    } else {
      setSelectedRecordingIds(allIds);
    }
  };

  const handleBulkDeleteRecordings = async () => {
    if (!selectedClientId || selectedRecordingIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedRecordingIds.length} selected compliance call recording(s)?`)) return;

    try {
      setIsBulkDeleting(true);
      const res = await api.bulkDeleteCallRecordings(selectedClientId, selectedRecordingIds);
      if (res && res.success) {
        toast.success(res.message || `${selectedRecordingIds.length} recording(s) deleted`);
        setSelectedRecordingIds([]);
        if (playingAudioUrl) {
          setPlayingAudioUrl(null);
        }
        await refreshVaultKeepFolder(selectedClientId);
      } else {
        toast.error(res?.message || 'Bulk delete failed');
      }
    } catch (err: any) {
      toast.error('Bulk delete error: ' + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const openSubfolder = (folderKey: string) => {
    setSelectedSubfolderKey(folderKey);
    setNavLevel('SUBFOLDER');
  };

  // Download entire vault as ZIP
  const handleDownloadFullZip = async (clientId?: string, clientName?: string) => {
    const targetId = clientId || selectedClientId;
    if (!targetId) return;
    try {
      toast.loading('Preparing complete Client Vault ZIP dossier with all PDFs & CSVs...', { id: 'zip-download' });
      await api.downloadVaultFile(`/admin/vaults/${targetId}/export-zip`, `${clientName || 'Client'}_Vault_Dossier.zip`);
      toast.success('Client Vault ZIP successfully downloaded!', { id: 'zip-download' });
    } catch (err: any) {
      toast.error('Download failed: ' + (err.message || 'Network error'), { id: 'zip-download' });
    }
  };

  // Download specific sub-folder
  const handleDownloadFolder = async (folderKey: string) => {
    if (!selectedClientId) return;
    try {
      toast.loading(`Exporting ${folderKey}...`, { id: 'folder-download' });
      const clientName = vaultDetails?.client?.name || 'Client';
      const isZip = folderKey.includes('Recording') || folderKey.includes('KYC') || folderKey.includes('Invoices') || folderKey.includes('Research') || folderKey.includes('02_') || folderKey.includes('04_') || folderKey.includes('05_') || folderKey.includes('07_');
      const isPdf = folderKey.includes('Agreements') || folderKey.includes('06_');
      const ext = isZip ? 'zip' : isPdf ? 'pdf' : 'xlsx';
      await api.downloadVaultFile(
        `/admin/vaults/${selectedClientId}/export-folder/${folderKey}`,
        `${clientName}_${folderKey}.${ext}`
      );
      toast.success(`${folderKey} exported successfully!`, { id: 'folder-download' });
    } catch (err: any) {
      toast.error('Export failed: ' + (err.message || 'Network error'), { id: 'folder-download' });
    }
  };

  // Download single invoice PDF
  const handleDownloadInvoice = async (paymentId: string, invoiceNumber?: string) => {
    if (!selectedClientId) return;
    try {
      toast.loading('Generating & downloading official Tax Invoice PDF...', { id: 'inv-download' });
      await api.downloadVaultInvoice(selectedClientId, paymentId, invoiceNumber);
      toast.success('Tax Invoice PDF downloaded successfully!', { id: 'inv-download' });
    } catch (err: any) {
      toast.error('Invoice download failed: ' + (err.message || 'Error'), { id: 'inv-download' });
    }
  };

  // Download signed advisory agreement PDF
  const handleDownloadAgreement = async (clientName?: string) => {
    if (!selectedClientId) return;
    try {
      toast.loading('Generating & downloading official Signed Service Agreement PDF...', { id: 'agr-download' });
      await api.downloadVaultAgreement(selectedClientId, clientName);
      toast.success('Signed Service Agreement PDF downloaded!', { id: 'agr-download' });
    } catch (err: any) {
      toast.error('Agreement download failed: ' + (err.message || 'Error'), { id: 'agr-download' });
    }
  };

  // Direct file download handler (Forces save to disk for videos, images, docs)
  const handleDownloadDirectFile = async (fileUrl: string, title?: string) => {
    try {
      const filename = title || fileUrl.split('/').pop()?.split('?')[0] || 'KYC_Document';
      toast.loading(`Downloading ${filename}...`, { id: 'direct-dl' });
      await api.downloadFileFromUrl(fileUrl, filename);
      toast.success('Downloaded successfully!', { id: 'direct-dl' });
    } catch (err: any) {
      toast.error('Download failed: ' + (err.message || 'Error'), { id: 'direct-dl' });
    }
  };

  // Download research report PDF
  const handleDownloadResearchReport = async (reportId: string, title?: string, fileUrl?: string) => {
    if (!selectedClientId) return;
    try {
      if (fileUrl && (fileUrl.startsWith('http') || fileUrl.startsWith('/uploads'))) {
        await handleDownloadDirectFile(fileUrl, title || `Research_Report_${reportId}.pdf`);
        return;
      }
      toast.loading('Generating & downloading Research Report PDF...', { id: 'rep-download' });
      await api.downloadVaultResearchReport(selectedClientId, reportId, title);
      toast.success('Research Report PDF downloaded successfully!', { id: 'rep-download' });
    } catch (err: any) {
      toast.error('Report download failed: ' + (err.message || 'Error'), { id: 'rep-download' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Audio upload handler
  const handleAudioUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please choose an audio recording file (.mp3, .wav, .m4a)');
      return;
    }
    if (!selectedClientId) return;

    if (!uploadPurpose.trim()) {
      toast.error('Please enter recording title / call purpose');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadPurpose.trim());
      formData.append('callType', uploadPurpose.trim());
      formData.append('callDate', uploadCallDate);
      formData.append('durationSeconds', uploadDuration);
      formData.append('callerStaffName', uploadStaffName || 'Compliance Staff');
      formData.append('summary', uploadSummary);
      formData.append('isComplianceVerified', 'true');

      const res = await api.uploadCallRecording(selectedClientId, formData);
      if (res && res.success) {
        toast.success('Call recording secured in Client Vault!');
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadPurpose('');
        setUploadSummary('');
        // Refresh vault details without kicking user out of folder
        await refreshVaultKeepFolder(selectedClientId);
      } else {
        toast.error(res?.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('Failed to upload recording: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Audio delete handler
  const handleDeleteRecording = async (recordingId: string) => {
    if (!selectedClientId) return;
    if (!confirm('Are you sure you want to permanently delete this compliance call recording?')) return;

    try {
      const res = await api.deleteCallRecording(selectedClientId, recordingId);
      if (res && res.success) {
        toast.success('Recording deleted');
        if (playingAudioUrl) {
          setPlayingAudioUrl(null);
        }
        await refreshVaultKeepFolder(selectedClientId);
      } else {
        toast.error(res?.message || 'Delete failed');
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  // Audio player toggle
  const togglePlayAudio = (url: string) => {
    const fullAudioUrl = resolveMediaUrl(url);
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      setPlayingAudioUrl(url);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = fullAudioUrl;
          audioRef.current.play().catch(e => console.error('Play error', e));
        }
      }, 50);
    }
  };

  // Formatter for seconds
  const formatSec = (sec: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for call recordings player */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioUrl(null)}
        className="hidden"
      />

      {/* TOP HEADER & BREADCRUMBS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {navLevel !== 'ROOT' && (
              <button
                onClick={() => {
                  if (navLevel === 'SUBFOLDER') setNavLevel('CLIENT');
                  else setNavLevel('ROOT');
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-600 dark:text-slate-300"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* Desktop Path Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <button
                onClick={() => {
                  setNavLevel('ROOT');
                  setSelectedClientId(null);
                  setSelectedSubfolderKey(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition ${navLevel === 'ROOT'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <FolderArchive className="w-4 h-4 text-blue-500" />
                <span>Client Vaults</span>
              </button>

              {vaultDetails && navLevel !== 'ROOT' && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <button
                    onClick={() => {
                      setNavLevel('CLIENT');
                      setSelectedSubfolderKey(null);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-mono ${navLevel === 'CLIENT'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">{vaultDetails.folderName}</span>
                  </button>
                </>
              )}

              {selectedSubfolderKey && navLevel === 'SUBFOLDER' && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                    {selectedSubfolderKey}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {navLevel === 'ROOT' && (
              <>
                {/* Plan Status Dropdown Filter */}
                <div className="relative">
                  <select
                    value={planStatusFilter}
                    onChange={(e) => setPlanStatusFilter(e.target.value as any)}
                    className="appearance-none pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                  >
                    <option value="ALL">📁 All Clients</option>
                    <option value="ACTIVE">🟢 Active Plans Only</option>
                    <option value="EXPIRED">🟡 Expired Plans Only</option>
                    <option value="NO_PLAN">⚪ No Plan (Signups Only)</option>
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 rotate-90 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
                </div>

                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, phone, PAN, email, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition ${viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                      }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={loadVaults}
                  className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </>
            )}

            {navLevel === 'CLIENT' && vaultDetails && effectiveCanDownload && (
              <button
                onClick={() => handleDownloadFullZip(vaultDetails.client?.id, vaultDetails.client?.name)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete Vault (ZIP)</span>
              </button>
            )}

            {navLevel === 'SUBFOLDER' && selectedSubfolderKey && effectiveCanDownload && (
              <button
                onClick={() => handleDownloadFolder(selectedSubfolderKey)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-sm font-semibold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Folder Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. ROOT VIEW: ALL CLIENT FOLDERS                                     */}
      {/* ===================================================================== */}
      {navLevel === 'ROOT' && (
        <div className="space-y-4">
          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setPlanStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${planStatusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
              >
                <span>📁 All Clients ({vaults.length})</span>
              </button>
              <button
                onClick={() => setPlanStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${planStatusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Active Plans</span>
              </button>
              <button
                onClick={() => setPlanStatusFilter('EXPIRED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${planStatusFilter === 'EXPIRED'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Expired Plans</span>
              </button>
              <button
                onClick={() => setPlanStatusFilter('NO_PLAN')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${planStatusFilter === 'NO_PLAN'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>No Plan (Signups Only)</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Sorted by: <span className="font-bold text-slate-700 dark:text-slate-200">Latest Registration First</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-500" />
              <p className="text-sm font-semibold">Indexing Client Vaults & Dossiers...</p>
            </div>
          ) : vaults.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <FolderArchive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Client Vaults Matching Filter</h3>
              <p className="text-xs text-slate-400 mt-1">Try switching the filter dropdown to "All Clients" or clearing your search term.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {vaults.map((vault) => {
                const isPlanActive = vault.planStatus === 'ACTIVE_PLAN' || vault.status === 'ACTIVE' && (vault.metrics?.activeSubscriptions || 0) > 0;
                const isPlanExpired = vault.planStatus === 'EXPIRED_PLAN' || ((vault.metrics?.totalSubscriptions || 0) > 0 && (vault.metrics?.activeSubscriptions || 0) === 0);
                const isNoPlan = vault.planStatus === 'NO_PLAN' || (vault.metrics?.totalSubscriptions || 0) === 0;

                const cardBorder = isPlanActive
                  ? 'border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-500 hover:shadow-emerald-500/10'
                  : isPlanExpired
                    ? 'border-amber-200 dark:border-amber-800/60 hover:border-amber-500 hover:shadow-amber-500/10'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 hover:shadow-indigo-500/10';

                const folderIconBox = isPlanActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : isPlanExpired
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

                const folderIconFill = isPlanActive
                  ? 'fill-emerald-500/30 text-emerald-600'
                  : isPlanExpired
                    ? 'fill-amber-500/30 text-amber-600'
                    : 'fill-indigo-500/30 text-indigo-600';

                return (
                  <div
                    key={vault.clientId}
                    className={`group bg-white dark:bg-slate-900 border ${cardBorder} hover:shadow-xl rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden`}
                    onClick={() => openClientVault(vault.clientId)}
                  >
                    {/* Top Accent Strip */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${isPlanActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : isPlanExpired
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-indigo-500 to-slate-500'
                      }`} />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner ${folderIconBox}`}>
                          <Folder className={`w-6 h-6 ${folderIconFill}`} />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isPlanActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Plan
                            </span>
                          ) : isPlanExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Expired Plan
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              No Plan (Lead)
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFullZip(vault.clientId, vault.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="Download Complete Dossier (ZIP)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Client Name & Active Plan Subtag */}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {vault.name}
                      </h4>

                      {vault.activePlanNames && vault.activePlanNames.length > 0 && (
                        <div className="mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 truncate bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md inline-block">
                          ✓ {vault.activePlanNames[0]}
                        </div>
                      )}

                      {/* Prominent Registration Date Badge */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">
                          Reg: <strong className="text-slate-900 dark:text-white font-bold">{vault.registeredAtFormatted || new Date(vault.registeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                        </span>
                      </div>

                      {/* Standardized OS Folder Name Tag with Clear Copy Action */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70">
                        <span className="truncate flex items-center gap-1.5" title={`Windows OS Folder: ${vault.folderName}`}>
                          <span>📁</span>
                          <span className="font-semibold">{vault.folderName}</span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(vault.folderName, vault.clientId);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 ml-1.5 shrink-0 px-2 py-0.5 rounded bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition shadow-xs"
                          title="Copy folder name to clipboard for Windows Explorer / local search"
                        >
                          {copiedId === vault.clientId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[9px]">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span className="text-[9px] font-semibold">Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Mobile:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {effectiveIsMasked ? maskMobile(vault.mobile) : (vault.mobile || 'N/A')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Email:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                            {effectiveIsMasked ? maskEmail(vault.email) : (vault.email || 'N/A')}
                          </span>
                        </div>
                        {vault.pan && (
                          <div className="flex items-center justify-between">
                            <span>PAN:</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {effectiveIsMasked ? maskPan(vault.pan) : vault.pan}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {vault.metrics?.totalFilesEstimated || 0} Files • 8 Subfolders
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5">Client Root Folder</th>
                      <th className="p-3.5">Registered Date</th>
                      <th className="p-3.5">Phone Number</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">PAN Card</th>
                      <th className="p-3.5">Active Plans</th>
                      <th className="p-3.5">Plan Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {vaults.map((vault) => {
                      const isPlanActive = vault.planStatus === 'ACTIVE_PLAN' || vault.status === 'ACTIVE' && (vault.metrics?.activeSubscriptions || 0) > 0;
                      const isPlanExpired = vault.planStatus === 'EXPIRED_PLAN' || ((vault.metrics?.totalSubscriptions || 0) > 0 && (vault.metrics?.activeSubscriptions || 0) === 0);

                      return (
                        <tr
                          key={vault.clientId}
                          onClick={() => openClientVault(vault.clientId)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <Folder className={`w-5 h-5 shrink-0 ${isPlanActive ? 'text-emerald-500 fill-emerald-500/20' : isPlanExpired ? 'text-amber-500 fill-amber-500/20' : 'text-indigo-500 fill-indigo-500/20'}`} />
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-100">{vault.name}</div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                                  <span>📁 {vault.folderName}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(vault.folderName, vault.clientId);
                                    }}
                                    className="hover:text-blue-500 text-slate-400 transition"
                                    title="Copy folder name"
                                  >
                                    {copiedId === vault.clientId ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            {vault.registeredAtFormatted || new Date(vault.registeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                            {effectiveIsMasked ? maskMobile(vault.mobile) : (vault.mobile || 'N/A')}
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300">
                            {effectiveIsMasked ? maskEmail(vault.email) : (vault.email || 'N/A')}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {effectiveIsMasked ? maskPan(vault.pan) : (vault.pan || '-')}
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {vault.metrics?.activeSubscriptions || 0}
                            </span>
                            <span className="text-slate-400"> / {vault.metrics?.totalSubscriptions || 0}</span>
                          </td>
                          <td className="p-3.5">
                            {isPlanActive ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                🟢 Active Plan
                              </span>
                            ) : isPlanExpired ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                🟡 Expired Plan
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                ⚪ No Plan (Lead)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownloadFullZip(vault.clientId, vault.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>ZIP</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. CLIENT VIEW: 8 SUB-FOLDERS                                         */}
      {/* ===================================================================== */}
      {navLevel === 'CLIENT' && (
        <div className="space-y-6">
          {detailsLoading || !vaultDetails ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3 text-blue-500" />
              <p className="text-sm">Opening Client Vault...</p>
            </div>
          ) : (
            <>
              {/* Client Dossier Profile Summary Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                      <User className="w-8 h-8 text-blue-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">{vaultDetails.client.name}</h2>
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                          {vaultDetails.client.status}
                        </span>
                        <span className="text-xs bg-white/10 text-white/80 px-2.5 py-0.5 rounded-full font-mono">
                          {vaultDetails.client.category || 'INDIVIDUAL'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-mono text-blue-200/80 bg-black/30 px-3 py-1.5 rounded-xl inline-block border border-white/10">
                        📁 {vaultDetails.folderName}
                      </div>
                      <div className="mt-3 flex items-center gap-4 sm:gap-6 text-xs text-white/70 flex-wrap">
                        <div>📞 <span className="font-semibold text-white">
                          {effectiveIsMasked ? maskMobile(vaultDetails.client.mobile) : (vaultDetails.client.mobile || 'N/A')}
                        </span></div>
                        <div>✉️ <span className="font-semibold text-white">
                          {effectiveIsMasked ? maskEmail(vaultDetails.client.email) : (vaultDetails.client.email || 'N/A')}
                        </span></div>
                        {vaultDetails.client.pan && (
                          <div>🪪 PAN: <span className="font-mono font-semibold text-amber-300">
                            {effectiveIsMasked ? maskPan(vaultDetails.client.pan) : vaultDetails.client.pan}
                          </span></div>
                        )}
                        <div>📅 Registered: <span className="font-semibold text-white">{new Date(vaultDetails.client.registeredAt).toLocaleDateString()}</span></div>
                      </div>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                      <button
                        onClick={() => handleDownloadFullZip(vaultDetails.client.id, vaultDetails.client.name)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg transition hover:shadow-xl"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Entire Dossier (ZIP)</span>
                      </button>
                      <div className="text-[11px] text-center text-white/60">
                        Extracts into 8 categorized folders with CSVs & Audio
                      </div>
                    </div>
                </div>
              </div>

              {/* 8 Desktop Sub-Folders Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
                    8 Client Vault Directories
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Click to inspect folder or export</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(vaultDetails.folders).map(([folderProp, folderData]: [string, any]) => {
                    const meta = SUBFOLDER_METADATA[folderData.key] || {
                      icon: Folder,
                      number: '00',
                      badge: 'Folder',
                      gradient: 'from-blue-600 to-indigo-600',
                      borderHover: 'hover:border-blue-500',
                      badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                      titleColor: 'text-blue-600 dark:text-blue-400',
                      headerBg: 'bg-slate-50 dark:bg-slate-800',
                      formatText: 'Files + Data'
                    };
                    const IconComp = meta.icon;

                    return (
                      <div
                        key={folderProp}
                        onClick={() => openSubfolder(folderData.key)}
                        className={`group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${meta.borderHover} hover:shadow-xl rounded-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden`}
                      >
                        {/* Top Gradient Highlight Bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />

                        <div className="p-5">
                          {/* Folder Header with Number Badge & Icon */}
                          <div className="flex items-start justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner ${meta.badgeBg}`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${meta.badgeBg}`}>
                                {meta.number}
                              </span>
                            </div>

                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                              {folderData.fileCount} {folderData.fileCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          {/* Highlighted Folder Title */}
                          <div className="mt-1">
                            <h4 className={`text-sm font-black ${meta.titleColor} tracking-tight group-hover:underline transition`}>
                              {folderData.title}
                            </h4>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>{meta.formatText}</span>
                            </div>
                          </div>

                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {folderData.description}
                          </p>

                          {/* Quick subfolder metric indicators */}
                          {folderData.key === '03_Trade_Signals' && folderData.metrics && (
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
                              <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                                {folderData.metrics.openTradesCount} Open
                              </span>
                              <span className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                                {folderData.metrics.closedTradesCount} Closed
                              </span>
                              <span className="text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-200/50 dark:border-violet-800/50">
                                {folderData.metrics.winRatePercentage}% Win
                              </span>
                            </div>
                          )}

                          {folderData.key === '07_Call_Recordings' && (
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/50 dark:border-rose-800/50 w-fit">
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>{folderData.fileCount} Audio Records</span>
                            </div>
                          )}
                        </div>

                        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
                          <span className="font-mono text-[11px] font-bold group-hover:text-blue-600 transition-colors">
                            📁 Open Folder
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFolder(folderData.key);
                              }}
                              className="p-1 hover:text-blue-600 text-slate-400 transition"
                              title="Export this folder"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SUBFOLDER VIEW: SPECIFIC FOLDER CONTENTS                          */}
      {/* ===================================================================== */}
      {navLevel === 'SUBFOLDER' && vaultDetails && selectedSubfolderKey && (
        <div className="space-y-6">
          {/* Subfolder Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span>{vaultDetails.folderName}</span>
                  <span>/</span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">{selectedSubfolderKey}</span>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
                  {selectedSubfolderKey.replace(/_/g, ' ')}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {selectedSubfolderKey === '07_Call_Recordings' && (
                  <button
                    onClick={() => {
                      setUploadStaffName('');
                      setUploadPurpose('');
                      setIsUploadModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Call Recording</span>
                  </button>
                )}

                <button
                  onClick={() => handleDownloadFolder(selectedSubfolderKey)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download This Folder</span>
                </button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 01_Basic_Profile                                       */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '01_Basic_Profile' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Client Profile & Registration Dossier
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Full Name</div>
                  <div className="text-base font-bold text-slate-800 dark:text-white mt-1">{vaultDetails.client.name}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Mobile Phone</div>
                  <div className="text-base font-bold text-slate-800 dark:text-white mt-1">
                    {effectiveIsMasked ? maskMobile(vaultDetails.client.mobile) : (vaultDetails.client.mobile || 'N/A')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Email Address</div>
                  <div className="text-base font-bold text-slate-800 dark:text-white mt-1 truncate">
                    {effectiveIsMasked ? maskEmail(vaultDetails.client.email) : (vaultDetails.client.email || 'N/A')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">PAN Number</div>
                  <div className="text-base font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {effectiveIsMasked ? maskPan(vaultDetails.client.pan) : (vaultDetails.client.pan || 'Not Submitted')}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Category</div>
                  <div className="text-base font-bold text-slate-800 dark:text-white mt-1">{vaultDetails.client.category || 'INDIVIDUAL'}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Registration Timestamp</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                    {new Date(vaultDetails.client.registeredAt).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Occupation</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                    {vaultDetails.folders.basicProfile?.data?.profile?.occupation || vaultDetails.client.occupation || 'Self-Employed / Professional'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Risk Profile Assessment</div>
                  <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-1">
                    {vaultDetails.folders.basicProfile?.data?.profile?.riskProfile || 'MODERATE'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Investment Horizon</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                    {vaultDetails.folders.basicProfile?.data?.profile?.investmentPeriod ? `${vaultDetails.folders.basicProfile.data.profile.investmentPeriod} Months` : '12+ Months'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 02_Subscriptions_&_Invoices                            */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '02_Subscriptions_&_Invoices' && (
            <div className="space-y-6">
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Total Service Plans</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                      {vaultDetails.folders.subscriptions?.data?.subscriptions?.length || 0}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Active Plans</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {(vaultDetails.folders.subscriptions?.data?.subscriptions || []).filter((s: any) => s.computedStatus === 'ACTIVE' || s.status === 'ACTIVE').length}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Invoices & Receipts</div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {vaultDetails.folders.subscriptions?.data?.payments?.length || (vaultDetails.folders.subscriptions?.data?.subscriptions?.length || 0)}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Service Subscriptions Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Service Subscriptions & Purchased Plans</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-500/20">
                        {vaultDetails.folders.subscriptions?.data?.subscriptions?.length || 0} Records
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Exact plan purchase timestamps, market segment coverage, validity dates, and official Tax Invoices.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3.5">Plan & Segment</th>
                        <th className="p-3.5">Purchase Date & Time</th>
                        <th className="p-3.5">Validity Period</th>
                        <th className="p-3.5">Amount (INR)</th>
                        <th className="p-3.5">Payment Mode & Ref</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">SEBI Tax Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(vaultDetails.folders.subscriptions?.data?.subscriptions || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No subscriptions or purchased plans found for this client.
                          </td>
                        </tr>
                      ) : (
                        (vaultDetails.folders.subscriptions?.data?.subscriptions || []).map((sub: any) => {
                          const isActive = sub.computedStatus === 'ACTIVE' || sub.status === 'ACTIVE';
                          const purchaseFormatted = sub.purchaseDateFormatted || (sub.purchaseDate ? new Date(sub.purchaseDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : (sub.createdAt ? new Date(sub.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'));

                          return (
                            <tr key={sub._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900 dark:text-white text-sm">{sub.plan?.name || 'Custom Service Plan'}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sub.plan?.researchSegments || sub.segment || 'EQUITY / DERIVATIVES'}</div>
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-white">
                                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{purchaseFormatted}</span>
                                </div>
                              </td>

                              <td className="p-3.5 text-slate-600 dark:text-slate-300">
                                <div><strong className="text-slate-800 dark:text-slate-100">{new Date(sub.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                                <div className="text-[11px] text-slate-400">to {new Date(sub.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              </td>

                              <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                ₹{(sub.amount || sub.amountTotal || sub.plan?.price || 0).toLocaleString()}
                              </td>

                              <td className="p-3.5">
                                <div className="font-medium text-slate-800 dark:text-slate-200">{sub.paymentMode || 'Online Gateway'}</div>
                                <div className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">{sub.transactionRef || sub.paymentId || '-'}</div>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  }`}>
                                  {isActive ? '🟢 ACTIVE' : '🔴 EXPIRED'}
                                </span>
                              </td>

                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => handleDownloadInvoice(sub.paymentId || sub._id, sub.transactionRef)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 transition shadow-sm"
                                  title="Download Official SEBI Tax Invoice PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  <span>Invoice (PDF)</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tax Invoices & Payment Ledger Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      <span>Tax Invoices & Payment Receipts Ledger</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      SEBI compliant GST tax invoices generated for all client transactions.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3.5">Invoice / Receipt ID</th>
                        <th className="p-3.5">Payment Date & Time</th>
                        <th className="p-3.5">Amount (INR)</th>
                        <th className="p-3.5">Payment Channel</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(vaultDetails.folders.subscriptions?.data?.payments || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No standalone invoice receipts recorded.
                          </td>
                        </tr>
                      ) : (
                        (vaultDetails.folders.subscriptions?.data?.payments || []).map((pay: any) => (
                          <tr key={pay._id || pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-slate-900 dark:text-white">
                                {pay.transactionRef || `INV-${String(pay._id || pay.id).slice(-8).toUpperCase()}`}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                {pay.paymentDateFormatted || new Date(pay.createdAt || pay.paymentDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                              ₹{(pay.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                              {pay.paymentMode || 'Online Payment Gateway'}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                {pay.status || 'SUCCESS'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleDownloadInvoice(pay._id || pay.id, pay.transactionRef)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Invoice (PDF)</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEBI Agreement Quick Action Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-200/80 dark:border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Mandatory SEBI Research Analyst Service Agreement
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Official signed client agreement with Aadhaar eSign verification, terms, and SEBI regulatory risk disclosure.
                    </p>
                  </div>
                </div>

                {effectiveCanDownload && (
                  <button
                    onClick={() => handleDownloadAgreement(vaultDetails.client?.name)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signed Agreement (PDF)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 03_Trade_Signals (Open vs Closed & P&L)                 */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '03_Trade_Signals' && (
            <div className="space-y-6">
              {/* Performance KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Total Trades</div>
                  <div className="text-xl font-black text-slate-800 dark:text-white mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.totalTrades || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Open Trades</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.openTradesCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Closed Trades</div>
                  <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.closedTradesCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Targets Hit</div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.targetHitCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Stoploss Hit</div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.stoplossHitCount || 0}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-slate-400">Win Rate %</div>
                  <div className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">
                    {vaultDetails.folders.tradeSignals?.metrics?.winRatePercentage || 0}%
                  </div>
                </div>
              </div>

              {/* Trade Signals Data Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Trade Recommendations Ledger
                  </h4>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setTradeFilter('ALL')}
                      className={`px-3 py-1 rounded-lg transition ${tradeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
                    >
                      All ({vaultDetails.folders.tradeSignals?.data?.length || 0})
                    </button>
                    <button
                      onClick={() => setTradeFilter('ACTIVE')}
                      className={`px-3 py-1 rounded-lg transition ${tradeFilter === 'ACTIVE' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Open Only
                    </button>
                    <button
                      onClick={() => setTradeFilter('CLOSED')}
                      className={`px-3 py-1 rounded-lg transition ${tradeFilter === 'CLOSED' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Closed
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Stock / Asset</th>
                        <th className="p-3">Segment</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Entry</th>
                        <th className="p-3">Targets</th>
                        <th className="p-3">Stoploss</th>
                        <th className="p-3">Exit Price</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">P&L (%)</th>
                        <th className="p-3">Open Date & Time</th>
                        <th className="p-3">Close Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(vaultDetails.folders.tradeSignals?.data || [])
                        .filter((s: any) => {
                          if (tradeFilter === 'ACTIVE') return s.status === 'ACTIVE' || s.status === 'OPEN';
                          if (tradeFilter === 'CLOSED') return s.status === 'CLOSED';
                          return true;
                        })
                        .map((sig: any) => (
                          <tr key={sig._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-white">{sig.stockSymbol}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{sig.stockName}</div>
                            </td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{sig.segment}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sig.callType === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {sig.callType}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-semibold">₹{sig.entryPrice}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {sig.targetsFormatted || [sig.target1, sig.target2, sig.target3].filter((t: any) => t !== null && t !== undefined && t !== '').map((t: any) => `₹${t}`).join(' / ')}
                            </td>
                            <td className="p-3 font-mono text-rose-600 dark:text-rose-400">₹{sig.stoploss}</td>
                            <td className="p-3 font-mono">{sig.exitPrice ? `₹${sig.exitPrice}` : '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sig.status === 'ACTIVE' || sig.status === 'OPEN'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : sig.closeStatus === 'TARGET_HIT'
                                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                {sig.closeStatus || sig.status}
                              </span>
                            </td>
                            <td className="p-3 font-bold font-mono">
                              {sig.pnlPercent !== null && sig.pnlPercent !== undefined ? (
                                <span className={sig.pnlPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {sig.pnlPercent > 0 ? `+${sig.pnlPercent}%` : `${sig.pnlPercent}%`}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                {sig.openedAtFormatted || new Date(sig.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </td>
                            <td className="p-3 font-medium whitespace-nowrap">
                              {sig.status === 'ACTIVE' || sig.status === 'OPEN' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Open / Active
                                </span>
                              ) : sig.closedAt ? (
                                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {sig.closedAtFormatted || new Date(sig.closedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 07_Call_Recordings (Built-in Audio Player & Upload)     */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '07_Call_Recordings' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Compliance Audio Call Recordings
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      SEBI Regulatory audit recordings with caller staff attribution & duration
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Bulk Delete Button */}
                    {selectedRecordingIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteRecordings}
                        disabled={isBulkDeleting}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedRecordingIds.length})`}</span>
                      </button>
                    )}

                    <button
                      onClick={() => { setUploadPurpose(''); setIsUploadModalOpen(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Recording</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Select Toolbar Strip */}
                {(vaultDetails.folders.callRecordings?.data || []).length > 0 && (
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2 rounded-xl mb-3 border border-slate-200/60 dark:border-slate-800 text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={
                          (vaultDetails.folders.callRecordings?.data || []).length > 0 &&
                          selectedRecordingIds.length === (vaultDetails.folders.callRecordings?.data || []).length
                        }
                        onChange={() =>
                          handleToggleSelectAll(
                            (vaultDetails.folders.callRecordings?.data || []).map((r: any) => r._id)
                          )
                        }
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span>Select All Recordings ({(vaultDetails.folders.callRecordings?.data || []).length})</span>
                    </label>

                    {selectedRecordingIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {selectedRecordingIds.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecordingIds([])}
                          className="text-[11px] text-slate-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(vaultDetails.folders.callRecordings?.data || []).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <PhoneCall className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No Audio Recordings Yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Upload Recording" above to archive service calls.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(vaultDetails.folders.callRecordings?.data || []).map((rec: any) => {
                      const isPlaying = playingAudioUrl === rec.fileUrl;
                      const isSelected = selectedRecordingIds.includes(rec._id);

                      return (
                        <div
                          key={rec._id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition ${
                            isSelected
                              ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                              : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            {/* Checkbox for Multi-Select */}
                            <div className="pt-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRecording(rec._id)}
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                              />
                            </div>

                            <button
                              onClick={() => togglePlayAudio(rec.fileUrl)}
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${isPlaying
                                  ? 'bg-rose-600 text-white shadow-lg animate-pulse'
                                  : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white'
                                }`}
                              title={isPlaying ? 'Pause' : 'Play Recording'}
                            >
                              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                            </button>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800 dark:text-white">
                                  {rec.title || rec.fileName}
                                </span>
                                {rec.callType && rec.callType !== rec.title && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    {rec.callType}
                                  </span>
                                )}
                                {rec.flaggedCount > 0 ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 flex items-center gap-1 shadow-xs">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>⚠️ {rec.flaggedCount} Banned Words</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>✓ SEBI Clean</span>
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                <span>Duration: <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatSec(rec.durationSeconds)}</strong></span>
                                <span>Staff: <strong className="text-slate-700 dark:text-slate-300">{rec.callerStaffName || 'Staff'}</strong></span>
                                <span>Date: <strong className="text-slate-700 dark:text-slate-300">{new Date(rec.callDate).toLocaleString()}</strong></span>
                              </div>

                              {rec.summary && (
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                  {rec.summary}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                            <button
                              type="button"
                              onClick={() => openRecordingReview(rec)}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                              title="View full conversation chat & audit prohibited SEBI keywords"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>👁️ View Conversation</span>
                            </button>

                            {effectiveCanDownload && (
                              <a
                                href={resolveMediaUrl(rec.fileUrl)}
                                download={rec.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                title="Download Audio File"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteRecording(rec._id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                              title="Delete Recording"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 08_Audit_Trail                                         */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '08_Audit_Trail' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
                Immutable Access & Action Audit Logs
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Timestamp (UTC/IST)</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Action Event</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(vaultDetails.folders.auditTrail?.data || []).map((log: any) => (
                      <tr key={log._id || log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {new Date(log.timestamp || log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{log.title || log.action}</td>
                        <td className="p-3 text-slate-500 max-w-[300px] truncate">{log.description || '-'}</td>
                        <td className="p-3 font-mono text-slate-400">{log.ipAddress || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 04_Research_Reports (Traded Stock Reports & Direct PDF) */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '04_Research_Reports' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>SEBI Research Reports for Traded Stocks</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-500/20">
                      {(vaultDetails.folders.researchReports?.data || []).length} Reports
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official research reports created and uploaded by researchers strictly for stocks the client has traded (open or closed trades).
                  </p>
                </div>
              </div>

              {(vaultDetails.folders.researchReports?.data || []).length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No Traded Stock Research Reports</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Research reports only appear here when recommendations/trades are issued for this client's subscribed plans and reports are published or uploaded for those stocks.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(vaultDetails.folders.researchReports?.data || []).map((rep: any, idx: number) => {
                    const isBuy = (rep.recommendation || rep.type || '').toUpperCase().includes('BUY');
                    const isSell = (rep.recommendation || rep.type || '').toUpperCase().includes('SELL');

                    return (
                      <div
                        key={rep._id || idx}
                        className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Badges Row */}
                          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              {rep.stockSymbol && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm">
                                  {rep.stockSymbol}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isBuy
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : isSell
                                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              }`}>
                                {rep.recommendation || rep.type || 'ANALYSIS'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {rep.segment || 'EQUITY'}
                              </span>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rep.tradeStatus === 'OPEN'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {rep.tradeStatus === 'OPEN' ? '🟢 Open Trade' : '⚪ Closed Trade'}
                            </span>
                          </div>

                          {/* Title */}
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {rep.title || 'Research Report'}
                          </h5>

                          {/* Summary / Details preview */}
                          {(rep.summary || rep.stockName) && (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {rep.summary || `Research coverage and analysis for ${rep.stockName}.`}
                            </p>
                          )}

                          {/* Target Price if present */}
                          {rep.targetPrice && (
                            <div className="mt-3 flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400">Target Valuation:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ₹{rep.targetPrice}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer with Date & Direct Download Button */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {rep.publishedAt || rep.createdAt
                              ? new Date(rep.publishedAt || rep.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'Published'}
                          </span>

                          <button
                            onClick={() => handleDownloadResearchReport(rep._id, rep.title || rep.stockSymbol, rep.fileUrl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800/60 shadow-sm transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 05_KYC_Documents                                       */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '05_KYC_Documents' && (
            <div className="space-y-5">
              {/* KYC Verification Overview Banner */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 border border-cyan-200/80 dark:border-cyan-800/60 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>KYC Verification &amp; Identity Record</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          {vaultDetails.folders.basicProfile?.data?.profile?.kraVerified || (vaultDetails.client as any)?.kraVerified ? 'KRA VERIFIED' : 'ACTIVE KYC'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        SEBI-compliant investor identity verification record, PAN validation, DigiLocker data, and risk profiling dossier.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadFolder('05_KYC_Documents')}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download KYC Dossier (ZIP)</span>
                  </button>
                </div>

                {/* Identity Snapshot Grid */}
                <div className="mt-4 pt-4 border-t border-cyan-200/60 dark:border-cyan-800/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                    <div className="text-[10px] uppercase font-bold text-slate-400">PAN Card</div>
                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {effectiveIsMasked ? maskPan(vaultDetails.client.pan) : (vaultDetails.client.pan || 'Provided & Verified')}
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                    <div className="text-[10px] uppercase font-bold text-slate-400">DigiLocker / KRA</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {vaultDetails.folders.basicProfile?.data?.profile?.kraVerified || (vaultDetails.client as any)?.kraVerified ? 'Verified ✓' : 'Digitally Completed'}
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Risk Profile</div>
                    <div className="font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                      {vaultDetails.folders.basicProfile?.data?.profile?.riskProfile || 'MODERATE'}
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Investment Horizon</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                      {vaultDetails.folders.basicProfile?.data?.profile?.investmentPeriod ? `${vaultDetails.folders.basicProfile.data.profile.investmentPeriod} Months` : '12+ Months'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded & Signed Documents List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span>KYC &amp; Verified Client Documents</span>
                  </h4>
                  <span className="text-xs text-slate-400 font-bold">
                    {Math.max((vaultDetails.folders.kycDocuments?.data || []).length + 2, 2)} Document(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Official Signed Agreement Record */}
                  <div
                    onClick={() => handleDownloadAgreement(vaultDetails.client?.name)}
                    className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-start justify-between gap-3 hover:border-indigo-400 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                          Signed SEBI Service Agreement
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>eSigned &amp; Legally Binding</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {vaultDetails.folders.agreements?.data?.[0]?.signedAtFormatted ||
                              (vaultDetails.folders.agreements?.data?.[0]?.signedAt
                                ? new Date(vaultDetails.folders.agreements.data[0].signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : new Date(vaultDetails.client.registeredAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAgreement(vaultDetails.client?.name);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition"
                      title="Download Signed Agreement PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 2. Official KYC Verification Dossier */}
                  <div
                    onClick={() => handleDownloadFolder('05_KYC_Documents')}
                    className="p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/40 bg-cyan-50/40 dark:bg-cyan-950/20 flex items-start justify-between gap-3 hover:border-cyan-400 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-600/10 text-cyan-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 transition-colors">
                          KYC Investor Identity Dossier
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>DigiLocker / KRA Verified</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(vaultDetails.client.registeredAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadFolder('05_KYC_Documents');
                      }}
                      className="p-2 text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition"
                      title="Download KYC Dossier"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 3. Additional Uploaded KYC Documents if any */}
                  {(vaultDetails.folders.kycDocuments?.data || []).map((item: any, idx: number) => {
                    const itemName = item.title || item.fileName || item.docType || 'KYC Proof File';
                    return (
                      <div
                        key={item._id || idx}
                        onClick={() => {
                          if (item.fileUrl) {
                            handleDownloadDirectFile(item.fileUrl, itemName);
                          } else {
                            handleDownloadFolder('05_KYC_Documents');
                          }
                        }}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 hover:border-cyan-300 transition cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                              {itemName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {item.uploadedAt || item.createdAt ? new Date(item.uploadedAt || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Archived'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Preview in browser button */}
                          {item.fileUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const fullUrl = item.fileUrl.startsWith('http') ? item.fileUrl : `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl()}${item.fileUrl}`;
                                window.open(fullUrl, '_blank');
                              }}
                              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition"
                              title="Preview in Browser"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          {/* Direct Download button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.fileUrl) {
                                handleDownloadDirectFile(item.fileUrl, itemName);
                              } else {
                                handleDownloadFolder('05_KYC_Documents');
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 rounded-lg transition"
                            title="Download to Computer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* SUBFOLDER: 06_Signed_Agreements                                   */}
          {/* ----------------------------------------------------------------- */}
          {selectedSubfolderKey === '06_Signed_Agreements' && (
            <div className="space-y-5">
              {/* Highlight Banner for Signed Agreement */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Mandatory SEBI Research Analyst Agreement (Digital / eSigned)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        OFFICIAL PDF
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Official SEBI service terms, fee schedule, risk disclosures, and Aadhaar eSign verification record.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadAgreement(vaultDetails.client?.name)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Official Agreement (PDF)</span>
                </button>
              </div>

              {/* Agreements Archive List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Signed Agreement Documents Archive
                  </h4>
                  <span className="text-xs text-slate-400 font-bold">
                    {Math.max((vaultDetails.folders.agreements?.data || []).length, 1)} Document(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Primary Official Agreement Record */}
                  <div
                    onClick={() => handleDownloadAgreement(vaultDetails.client?.name)}
                    className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex items-start justify-between gap-3 hover:border-indigo-400 dark:hover:border-indigo-700 transition cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          SEBI Research Analyst Agreement
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aadhaar eSign Completed</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {vaultDetails.folders.agreements?.data?.[0]?.signedAtFormatted ||
                              (vaultDetails.folders.agreements?.data?.[0]?.signedAt
                                ? new Date(vaultDetails.folders.agreements.data[0].signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : new Date(vaultDetails.client.registeredAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAgreement(vaultDetails.client?.name);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition"
                      title="Download Signed Agreement PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Additional archived agreement versions if any */}
                  {(vaultDetails.folders.agreements?.data || []).slice(1).map((item: any, idx: number) => (
                    <div
                      key={item._id || idx}
                      onClick={() => handleDownloadAgreement(vaultDetails.client?.name)}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 hover:border-indigo-300 transition cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                            {item.title || item.fileName || 'Agreement Addendum'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {item.signedAtFormatted || (item.signedAt ? new Date(item.signedAt).toLocaleDateString() : 'Archived')}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAgreement(vaultDetails.client?.name);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ===================================================================== */}
      {/* MODAL: SEBI CALL RECORDING WORDS & TRANSCRIPT REVIEW                   */}
      {/* ===================================================================== */}
      {selectedReviewRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>SEBI Call Recording Conversation Audit</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Role-wise dialogue between Advisory Executive and Client with prohibited keyword highlights
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReviewRecording(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Call Info Strip & Audio Player */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedReviewRecording.title || selectedReviewRecording.fileName}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <span>Staff: <strong className="text-slate-700 dark:text-slate-300">{selectedReviewRecording.callerStaffName || 'Staff'}</strong></span>
                    <span>Client: <strong className="text-slate-700 dark:text-slate-300">{vaultDetails?.client?.name || 'Client'}</strong></span>
                    <span>Date: <strong className="text-slate-700 dark:text-slate-300">{new Date(selectedReviewRecording.callDate).toLocaleString()}</strong></span>
                    <span>Duration: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatSec(reviewAudioDuration || selectedReviewRecording.durationSeconds || 0)}</strong></span>
                  </div>
                </div>

                {selectedReviewRecording.fileUrl && (
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <audio
                      controls
                      src={resolveMediaUrl(selectedReviewRecording.fileUrl)}
                      className="h-9 w-52 sm:w-60 rounded-xl"
                      onLoadedMetadata={(e) => {
                        const dur = Math.round(e.currentTarget.duration);
                        if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                          setReviewAudioDuration(dur);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isAutoTranscribing}
                      onClick={handleAutoTranscribeFile}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="Convert audio speech to text using speech recognition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAutoTranscribing ? 'Transcribing...' : '🎙️ Auto-Transcribe'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SEBI Compliance Verdict Banner */}
              {reviewScanResult?.isFlagged ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <span className="font-black text-sm text-rose-900 dark:text-rose-200">
                        ⚠️ SEBI Prohibited Keywords Flagged ({reviewScanResult.flaggedCount} instances)
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200">
                      CRITICAL / NON-COMPLIANT
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    Prohibited terms indicating assured return, profit sharing, or unauthorized broker/account handling were detected in this conversation.
                  </p>
                  {/* Detected Words Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {(reviewScanResult.detectedKeywords || []).map((item: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shadow-xs flex items-center gap-1"
                      >
                        <span>{item.keyword}</span>
                        <span className="bg-white/20 px-1 rounded text-[10px]">{item.count}x</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                      ✓ SEBI Compliant Dialogue — No Prohibited Words Detected
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                    PASSED
                  </span>
                </div>
              )}

              {/* Tab Switcher: Role-wise Conversation Chat vs Raw Editor */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setConversationTab('chat')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      conversationTab === 'chat'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>💬 Conversation Chat View ({reviewConversationTurns.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConversationTab('editor')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      conversationTab === 'editor'
                        ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>📝 Edit Dialogue &amp; Notes</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: ROLE-BASED CHAT VIEW */}
              {conversationTab === 'chat' && (
                <div className="space-y-3">
                  {reviewConversationTurns.length === 0 ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mx-auto flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        No Conversation Dialogue Transcribed Yet
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Click the button below to transcribe audio speech directly from the recording file into role-wise conversation bubbles.
                      </p>
                      <button
                        type="button"
                        disabled={isAutoTranscribing}
                        onClick={handleAutoTranscribeFile}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isAutoTranscribing ? 'Transcribing Audio...' : '🎙️ Transcribe Audio into Chat'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[380px] overflow-y-auto">
                      {reviewConversationTurns.map((turn, tIdx) => {
                        const isExec = turn.speaker === 'EXECUTIVE';
                        const highlighted = highlightProhibitedWords(turn.text, reviewScanResult?.detectedKeywords || []);

                        return (
                          <div
                            key={tIdx}
                            className={`flex items-start gap-3 ${isExec ? 'justify-start' : 'justify-end'}`}
                          >
                            {/* Executive Avatar on Left */}
                            {isExec && (
                              <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm text-sm font-bold">
                                👨‍💼
                              </div>
                            )}

                            {/* Dialogue Bubble */}
                            <div
                              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-xs border ${
                                isExec
                                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-100 rounded-tr-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-black/5 dark:border-white/5 pb-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[11px] font-black ${isExec ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                    {turn.speakerName || (isExec ? selectedReviewRecording.callerStaffName || 'Executive' : vaultDetails?.client?.name || 'Client')}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isExec
                                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                                      : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                                  }`}>
                                    {isExec ? 'Advisory Staff' : 'Client'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">{turn.timestamp || '00:00'}</span>
                              </div>

                              <div
                                className="text-xs leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: highlighted || turn.text }}
                              />
                            </div>

                            {/* Client Avatar on Right */}
                            {!isExec && (
                              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm text-sm font-bold">
                                👤
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RAW EDITOR & MANUAL NOTES */}
              {conversationTab === 'editor' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Conversation Editor:</strong> You can edit the spoken dialogue below or format as <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Executive: ... \nClient: ...</code> to organize chat bubbles.
                    </div>
                  </div>

                  <textarea
                    rows={5}
                    value={reviewTranscriptText}
                    onChange={(e) => setReviewTranscriptText(e.target.value)}
                    placeholder="Enter or paste call conversation dialogue..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white font-sans leading-relaxed"
                  />

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isAutoTranscribing}
                        onClick={handleAutoTranscribeFile}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        title="Transcribe speech directly from audio recording"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isAutoTranscribing ? 'Transcribing Audio...' : '🎙️ Auto-Transcribe Audio'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={isListeningSpeech ? handleStopSpeechToText : handleStartSpeechToText}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                          isListeningSpeech
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                        }`}
                        title="Listen from microphone or audio speaker"
                      >
                        {isListeningSpeech ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-500" />}
                        <span>{isListeningSpeech ? '⏹️ Stop Voice' : '🎤 Transcribe from Voice'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isScanningTranscript}
                      onClick={() => handleScanTranscript()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isScanningTranscript ? 'Scanning...' : '⚡ Re-Scan Prohibited Words'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Prohibited Words Reference Legend */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
                <strong className="text-slate-700 dark:text-slate-300">SEBI Regulatory Scanner Watchlist:</strong>
                <p>
                  Scans for prohibited terms like: <code className="text-rose-600 font-bold">profit sharing</code>, <code className="text-rose-600 font-bold">100% profit</code>, <code className="text-rose-600 font-bold">guaranteed return / profit</code>, <code className="text-rose-600 font-bold">100% गारंटी</code>, <code className="text-rose-600 font-bold">broker handling</code>, <code className="text-rose-600 font-bold">account handling</code>, <code className="text-rose-600 font-bold">fake commitment</code>, <code className="text-rose-600 font-bold">loss recovery</code>, <code className="text-rose-600 font-bold">sure shot</code>, etc.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedReviewRecording(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: UPLOAD CALL RECORDING                                          */}
      {/* ===================================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Upload Call Recording</h3>
                  <p className="text-xs text-slate-400">Save telephone service audio into client vault</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAudioUpload} className="mt-5 space-y-4">
              {/* File input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Audio File (.mp3, .wav, .m4a, .ogg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.ogg"
                  onChange={handleAudioFileChange}
                  required
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 dark:file:bg-slate-800 dark:file:text-slate-200 cursor-pointer"
                />
              </div>

              {/* Recording Title / Purpose (Mandatory Custom Input) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Recording Title / Purpose <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Risk profiling call, Trade advice, Onboarding discussion"
                    value={uploadPurpose}
                    onChange={(e) => setUploadPurpose(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Call Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 180"
                    value={uploadDuration}
                    onChange={(e) => setUploadDuration(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Caller Staff Name & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Caller Staff Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Research Analyst / PO"
                    value={uploadStaffName}
                    onChange={(e) => setUploadStaffName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Call Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={uploadCallDate}
                    onChange={(e) => setUploadCallDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Summary / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Call Summary & Compliance Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of recommendations, risk disclosures, or client instructions..."
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Securing Audio...</span>
                    </>
                  ) : (
                    <span>Upload Recording</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
