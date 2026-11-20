'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  Mic,
  MicOff,
  Keyboard,
  X,
  Check,
  AlertTriangle,
  Send,
  Loader2,
  ChevronDown,
  Search,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCategories: any[];
  stocks: any[];
  onFetchStocks: (query: string) => Promise<any>;
}

// Fallback index mappings with existing MongoDB ObjectIds
const KNOWN_INDICES: Record<string, { _id: string; symbol: string; name: string }> = {
  BANKNIFTY: { _id: '6abf9e14613b1139aa6769d9', symbol: 'BANKNIFTY', name: 'NIFTY Bank Index' },
  NIFTY: { _id: '6abf9e14613b1139aa6769d4', symbol: 'NIFTY', name: 'NIFTY 50 Index' },
  FINNIFTY: { _id: '6abf9e14613b1139aa6769dd', symbol: 'FINNIFTY', name: 'NIFTY Financial Services Index' },
  MIDCPNIFTY: { _id: '6abf9e14613b1139aa6769df', symbol: 'MIDCPNIFTY', name: 'NIFTY Midcap Select Index' },
  SENSEX: { _id: '6abf9e14613b1139aa676a09', symbol: 'SENSEX', name: 'BSE S&P Sensex Index' },
  BANKEX: { _id: '6abf9e14613b1139aa676a0d', symbol: 'BANKEX', name: 'BSE S&P Bankex Index' },
  RELIANCE: { _id: '6aa52df51dff9283d4e0af22', symbol: 'RELIANCE', name: 'Reliance Industries Limited' },
};

// Calculate the nearest upcoming Thursday for F&O expiry
function getUpcomingThursday(): string {
  const d = new Date();
  const day = d.getDay(); // 0: Sun, 1: Mon, ..., 4: Thu, ..., 6: Sat
  let diff = 4 - day;
  if (diff < 0) {
    diff += 7;
  }
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// Map Hindi / Devanagari words to English keywords
function normalizeSpokenHindiText(text: string): string {
  if (!text) return '';
  let s = text;

  // Devanagari numerals to English digits
  s = s.replace(/०/g, '0')
       .replace(/१/g, '1')
       .replace(/२/g, '2')
       .replace(/३/g, '3')
       .replace(/४/g, '4')
       .replace(/५/g, '5')
       .replace(/६/g, '6')
       .replace(/७/g, '7')
       .replace(/८/g, '8')
       .replace(/९/g, '9');

  // Common Hindi spoken numbers
  s = s.replace(/\b(बारह|बाहर)\b/gi, '12')
       .replace(/\b(दस)\b/gi, '10')
       .replace(/\b(आठ)\b/gi, '8')
       .replace(/\b(छह|छः)\b/gi, '6')
       .replace(/\b(बीस)\b/gi, '20')
       .replace(/\b(तीस)\b/gi, '30')
       .replace(/\b(पचास)\b/gi, '50')
       .replace(/\b(सौ)\b/gi, '100');

  // Actions
  s = s.replace(/\b(बाय|बाई|बाइक|खरीद|खरीदो|खरीदना|लेना)\b/gi, 'BUY')
       .replace(/\b(सेल|बेच|बेचो|बिक्री|शॉर्ट)\b/gi, 'SELL');

  // Option Types
  s = s.replace(/\b(कॉल ऑप्शन|कॉल|सीई)\b/gi, 'CE')
       .replace(/\b(पुट ऑप्शन|पुट|पीई)\b/gi, 'PE');

  // Common Stock Names
  s = s.replace(/\b(रिलायंस|रिलाइंस)\b/gi, 'RELIANCE')
       .replace(/\b(निफ्टी|निफ़्टी)\b/gi, 'NIFTY')
       .replace(/\b(बैंक\s*निफ्टी|बैंकनिफ्टी)\b/gi, 'BANKNIFTY')
       .replace(/\b(फिन\s*निफ्टी|फिननिफ्टी)\b/gi, 'FINNIFTY')
       .replace(/\b(मिडकॅप)\b/gi, 'MIDCPNIFTY')
       .replace(/\b(सेंसेक्स)\b/gi, 'SENSEX')
       .replace(/\b(टाटा\s*मोटर्स?)\b/gi, 'TATAMOTORS')
       .replace(/\b(टाटा\s*स्टील)\b/gi, 'TATASTEEL')
       .replace(/\b(एच\s*डी\s*एफ\s*सी|एचडीएफसी)\b/gi, 'HDFCBANK')
       .replace(/\b(एस\s*बी\s*आई|एसबीआई)\b/gi, 'SBIN')
       .replace(/\b(इन्फोसिस|इन्फ़ी)\b/gi, 'INFY')
       .replace(/\b(क्रूड\s*ऑयल)\b/gi, 'CRUDEOIL');

  // Parameters
  s = s.replace(/\b(टारगेट|लक्ष्य)\b/gi, 'TARGET')
       .replace(/\b(स्टॉप\s*लॉस|स्टॉपलॉस|एसएल)\b/gi, 'STOPLOSS')
       .replace(/\b(प्राइस|भाव|रेट|पर|से)\b/gi, '@');

  return s;
}

export const QuickTradeModal: React.FC<QuickTradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableCategories = [],
  stocks = [],
  onFetchStocks
}) => {
  // Step 1: Mandatory Segment & Plan Selection
  const [selectedSegment, setSelectedSegment] = useState<'CASH' | 'OPTION' | 'FUTURE' | 'COMMODITY' | ''>('');
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);

  // Input Mode
  const [inputMode, setInputMode] = useState<'TYPE' | 'VOICE'>('VOICE');
  const [rawText, setRawText] = useState('');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Parsed Trade State
  const [callType, setCallType] = useState<'BUY' | 'SELL'>('BUY');
  const [matchedStock, setMatchedStock] = useState<any | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [isStockSearching, setIsStockSearching] = useState(false);
  const [strikePrice, setStrikePrice] = useState('');
  const [optionType, setOptionType] = useState<'CE' | 'PE' | ''>('');
  const [expiryDate, setExpiryDate] = useState(getUpcomingThursday());
  const [entryPrice, setEntryPrice] = useState('');
  const [entryType, setEntryType] = useState<'AT CMP' | 'ABOVE' | 'BELOW'>('AT CMP');
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [stoploss, setStoploss] = useState('');
  const [tradeDuration, setTradeDuration] = useState('INTRADAY');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-load stocks on modal open so all MongoDB ObjectIds are available
  useEffect(() => {
    if (isOpen && onFetchStocks) {
      onFetchStocks('');
    }
  }, [isOpen, onFetchStocks]);

  // Filter plan categories based on selected segment
  const filteredPlans = useMemo(() => {
    if (!selectedSegment) return [];
    return availableCategories.filter((c: any) => {
      const segs = (c.segments || '').toUpperCase();
      if (!segs || segs === 'ALL') return true;
      return segs.includes(selectedSegment);
    });
  }, [availableCategories, selectedSegment]);

  // Speech recognition initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Transcribes Hindi & English natural vocabulary

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          setRawText(transcript.trim());
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser. Please type trade.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('🎙️ Listening... Bolna shuru kijiye (Hindi/English)');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Natural Language Parser with Hindi & English Normalization
  useEffect(() => {
    if (!rawText.trim()) return;

    // Pre-normalize Hindi speech text to standard English tokens
    const normalized = normalizeSpokenHindiText(rawText);
    const lower = normalized.toLowerCase();

    // 1. Call Type Detection
    if (lower.includes('sell') || lower.includes('short') || lower.includes('becho') || lower.includes('bikri')) {
      setCallType('SELL');
    } else if (lower.includes('buy') || lower.includes('long') || lower.includes('kharido') || lower.includes('lena')) {
      setCallType('BUY');
    }

    // 2. Option Strike & Type (CE / PE)
    const optionMatch = normalized.match(/(\d{3,6})\s*(?:ka\s*)?(ce|pe|call|put)/i) ||
                        normalized.match(/(ce|pe|call|put)\s*(\d{3,6})/i);
    if (optionMatch) {
      let strike = '';
      let type = '';
      if (!isNaN(Number(optionMatch[1]))) {
        strike = optionMatch[1];
        type = optionMatch[2].toUpperCase();
      } else {
        type = optionMatch[1].toUpperCase();
        strike = optionMatch[2];
      }
      setStrikePrice(strike);
      setOptionType(type.includes('P') ? 'PE' : 'CE');
    }

    // 3. Entry Price Detection
    const entryMatch = normalized.match(/(?:@|at|cmp|entry|price|bhav|buy\s*krna\s*hai|kharidna\s*hai)\s*[:\s]*(\d+(?:\.\d+)?)/i) ||
                       normalized.match(/(\d+(?:\.\d+)?)\s*(?:se\s*buy|par\s*buy)/i);
    if (entryMatch) {
      setEntryPrice(entryMatch[1]);
      if (lower.includes('above') || lower.includes('upar')) setEntryType('ABOVE');
      else if (lower.includes('below') || lower.includes('niche')) setEntryType('BELOW');
      else setEntryType('AT CMP');
    }

    // 4. Target 1 & Target 2 Detection
    const targetMatch = normalized.match(/(?:target|tgt|phla\s*target|first\s*target|t1)\s*[:\s]*(\d+(?:\.\d+)?)(?:[,\s]+(?:t2|second\s*target|tgt2)?[:\s]*(\d+(?:\.\d+)?))?/i);
    if (targetMatch) {
      if (targetMatch[1]) setTarget1(targetMatch[1]);
      if (targetMatch[2]) setTarget2(targetMatch[2]);
    }

    // 5. Stop Loss Detection
    const slMatch = normalized.match(/(?:stoploss|stop\s*loss|sl)\s*[:\s]*(\d+(?:\.\d+)?)/i);
    if (slMatch) {
      setStoploss(slMatch[1]);
    }

    // 6. Trade Duration
    if (lower.includes('btst')) setTradeDuration('BTST');
    else if (lower.includes('positional')) setTradeDuration('POSITIONAL');
    else if (lower.includes('short term')) setTradeDuration('SHORT TERM');
    else setTradeDuration('INTRADAY');

    // 7. Stock / Symbol Matching from DB
    const majorIndices = [
      { key: 'banknifty', symbol: 'BANKNIFTY', name: 'Nifty Bank' },
      { key: 'nifty', symbol: 'NIFTY', name: 'Nifty 50' },
      { key: 'finnifty', symbol: 'FINNIFTY', name: 'Nifty Fin Service' },
      { key: 'midcpnifty', symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select' },
      { key: 'sensex', symbol: 'SENSEX', name: 'BSE SENSEX' },
      { key: 'reliance', symbol: 'RELIANCE', name: 'Reliance Industries' },
      { key: 'crudeoil', symbol: 'CRUDEOIL', name: 'Crude Oil MCX' },
      { key: 'gold', symbol: 'GOLD', name: 'Gold MCX' },
      { key: 'silver', symbol: 'SILVER', name: 'Silver MCX' }
    ];

    let foundStock: any = null;
    for (const ind of majorIndices) {
      if (lower.includes(ind.key)) {
        foundStock = stocks.find((s: any) => s.symbol.toUpperCase() === ind.symbol);
        if (!foundStock) {
          const fallback = KNOWN_INDICES[ind.symbol];
          foundStock = fallback
            ? { _id: fallback._id, id: fallback._id, symbol: fallback.symbol, name: fallback.name }
            : { _id: ind.symbol, id: ind.symbol, symbol: ind.symbol, name: ind.name };
        }
        break;
      }
    }

    // Check against loaded stock symbols if not an index
    if (!foundStock && stocks.length > 0) {
      const words = normalized.toUpperCase().split(/[^A-Z0-9]+/);
      for (const word of words) {
        if (word.length >= 3) {
          const match = stocks.find((s: any) => {
            const sym = s.symbol.toUpperCase();
            return sym === word || sym.startsWith(word) || word.startsWith(sym);
          });
          if (match) {
            foundStock = match;
            break;
          }
        }
      }
    }

    if (foundStock) {
      setMatchedStock(foundStock);
    }
  }, [rawText, stocks]);

  // Segment Mismatch Check
  const segmentMismatch = useMemo(() => {
    if (!selectedSegment) return null;
    const lower = rawText.toLowerCase();
    const hasOptionKeywords = lower.includes('ce') || lower.includes('pe') || lower.includes('call') || lower.includes('put') || lower.includes('कॉल') || lower.includes('ऑप्शन') || Boolean(strikePrice);

    if (selectedSegment === 'CASH' && hasOptionKeywords) {
      return {
        type: 'CASH_WITH_OPTION',
        message: 'Selected Segment is CASH, but an OPTION (CE/PE) trade was detected in voice/text!',
        recommendedSegment: 'OPTION'
      };
    }
    if (selectedSegment === 'FUTURE' && hasOptionKeywords) {
      return {
        type: 'FUTURE_WITH_OPTION',
        message: 'Selected Segment is FUTURE, but an OPTION (CE/PE) strike was detected!',
        recommendedSegment: 'OPTION'
      };
    }
    return null;
  }, [selectedSegment, rawText, strikePrice]);

  // Strict Pre-Flight Checklist
  const preflightChecklist = useMemo(() => {
    const ep = parseFloat(entryPrice);
    const t1 = parseFloat(target1);
    const t2 = target2 ? parseFloat(target2) : null;
    const sl = parseFloat(stoploss);

    let priceLogicValid = false;
    let priceLogicError = '';
    if (ep && t1 && sl) {
      if (callType === 'BUY') {
        if (sl >= ep) {
          priceLogicError = 'SL must be less than Entry';
        } else if (t1 <= ep) {
          priceLogicError = 'Target 1 must be greater than Entry';
        } else if (t2 !== null && t2 <= t1) {
          priceLogicError = `In BUY trade, Target 2 (₹${t2}) must be greater than Target 1 (₹${t1}). (Target 1 cannot be above Target 2)`;
        } else {
          priceLogicValid = true;
        }
      } else {
        if (sl <= ep) {
          priceLogicError = 'SL must be greater than Entry';
        } else if (t1 >= ep) {
          priceLogicError = 'Target 1 must be less than Entry';
        } else if (t2 !== null && t2 >= t1) {
          priceLogicError = `In SELL trade, Target 2 (₹${t2}) must be less than Target 1 (₹${t1}). (Target 1 cannot be below Target 2)`;
        } else {
          priceLogicValid = true;
        }
      }
    }

    return {
      segmentSelected: Boolean(selectedSegment),
      planSelected: selectedPlanIds.length > 0,
      stockSelected: Boolean(matchedStock),
      optionContractValid: selectedSegment !== 'OPTION' || (Boolean(strikePrice) && Boolean(optionType)),
      pricesEntered: Boolean(ep && t1 && sl),
      priceLogicValid,
      priceLogicError,
      noMismatch: !segmentMismatch
    };
  }, [selectedSegment, selectedPlanIds, matchedStock, strikePrice, optionType, entryPrice, target1, stoploss, callType, segmentMismatch]);

  const isReadyToDispatch =
    preflightChecklist.segmentSelected &&
    preflightChecklist.planSelected &&
    preflightChecklist.stockSelected &&
    preflightChecklist.optionContractValid &&
    preflightChecklist.pricesEntered &&
    preflightChecklist.priceLogicValid &&
    preflightChecklist.noMismatch;

  // Search stocks manually if needed
  const handleStockSearch = async (q: string) => {
    setStockSearchQuery(q);
    if (q.trim().length >= 2) {
      setIsStockSearching(true);
      try {
        await onFetchStocks(q);
      } finally {
        setIsStockSearching(false);
      }
    }
  };

  // Submit Handler
  const handleDispatchTrade = async () => {
    if (!isReadyToDispatch) {
      toast.error('Please complete all required parameters before dispatching.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      let finalStockId = matchedStock?._id || matchedStock?.id;
      // If not a 24-character ObjectId, look up in KNOWN_INDICES or stocks list
      if (!finalStockId || finalStockId.length !== 24) {
        const sym = (matchedStock?.symbol || '').toUpperCase();
        if (KNOWN_INDICES[sym]) {
          finalStockId = KNOWN_INDICES[sym]._id;
        } else {
          const found = stocks.find((s: any) => s.symbol.toUpperCase() === sym);
          if (found && (found._id || found.id)) {
            finalStockId = found._id || found.id;
          }
        }
      }

      formData.append('segment', selectedSegment);
      formData.append('planIds', JSON.stringify(selectedPlanIds));
      formData.append('callType', callType);
      formData.append('tradeDuration', tradeDuration);
      formData.append('stockId', finalStockId || matchedStock?.symbol || 'NIFTY');

      if ((selectedSegment === 'OPTION' || selectedSegment === 'FUTURE') && expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      if (selectedSegment === 'OPTION' && strikePrice) {
        formData.append('strikePrice', strikePrice);
      }
      if (selectedSegment === 'OPTION' && optionType) {
        formData.append('optionType', optionType);
      }

      formData.append('entryPrice', entryPrice);
      formData.append('entryType', entryType);
      formData.append('target1', target1);
      if (target2) formData.append('target2', target2);
      formData.append('stoploss', stoploss);

      const autoDescription = `Quick Dispatch: Technical momentum setup on ${matchedStock.symbol || 'contract'} with favorable risk-reward ratio. Follow strict stoploss.`;
      formData.append('description', autoDescription);
      formData.append('isQuickTrade', 'true');
      formData.append('source', 'QUICK_TRADE');

      const res = await api.createSignal(formData);
      if (res.success) {
        toast.success('⚡ Quick Signal dispatched to clients successfully!');
        if (isListening && recognitionRef.current) {
          recognitionRef.current.stop();
        }
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to dispatch trade.');
      }
    } catch (err: any) {
      toast.error('Error dispatching trade: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c121e] border border-slate-300 dark:border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Sticky Header - NEVER CROPS */}
        <div className="shrink-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-600/10 border-b border-slate-200 dark:border-white/10 px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ⚡ Quick Trade Dispatcher
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Researcher Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segment &amp; Plan chunein, fir voice se bolein ya ek line type karein.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body - Header and Footer always stay anchored */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* STEP 1: MANDATORY SEGMENT & PLAN SELECTION */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
                Step 1: Select Segment &amp; Service Plan <span className="text-red-500">*</span>
              </span>
              {selectedSegment && (
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                  ✓ {selectedSegment} Active
                </span>
              )}
            </div>

            {/* Segment Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'CASH / EQUITY' },
                { id: 'OPTION', label: 'OPTION (CE/PE)' },
                { id: 'FUTURE', label: 'FUTURE' },
                { id: 'COMMODITY', label: 'COMMODITY' }
              ].map(seg => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => {
                    setSelectedSegment(seg.id as any);
                    setSelectedPlanIds([]);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all border cursor-pointer ${
                    selectedSegment === seg.id
                      ? 'bg-primary-600 text-white border-primary-500 shadow-md shadow-primary-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-primary-500/50'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>

            {/* Plan Category Multi-Select */}
            {selectedSegment && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Target Plan Categories:
                  </label>
                  {filteredPlans.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPlanIds.length === filteredPlans.length) {
                          setSelectedPlanIds([]);
                        } else {
                          setSelectedPlanIds(filteredPlans.map((p: any) => p.id || p._id));
                        }
                      }}
                      className="text-[11px] text-primary-600 dark:text-primary-400 font-bold hover:underline cursor-pointer"
                    >
                      {selectedPlanIds.length === filteredPlans.length ? 'Deselect All' : 'Select All Plans'}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {filteredPlans.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      No plan categories configured for {selectedSegment}
                    </span>
                  ) : (
                    filteredPlans.map((plan: any) => {
                      const pId = plan.id || plan._id;
                      const isSelected = selectedPlanIds.includes(pId);
                      return (
                        <button
                          key={pId}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPlanIds(selectedPlanIds.filter(id => id !== pId));
                            } else {
                              setSelectedPlanIds([...selectedPlanIds, pId]);
                            }
                          }}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-400'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span>{plan.name}</span>
                          {typeof plan.activeClientCount === 'number' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              👥 {plan.activeClientCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: INPUT MODE (VOICE MIC OR TEXT BOX) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[11px] font-black">2</span>
                Step 2: Input Trade (Voice Mic ya Type Karein)
              </span>

              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setInputMode('VOICE')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    inputMode === 'VOICE'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Mic 🎙️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('TYPE')}
                  className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    inputMode === 'TYPE'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Type Text</span>
                </button>
              </div>
            </div>

            {/* Voice Input Section */}
            {inputMode === 'VOICE' && (
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-xl p-4 text-center space-y-2.5">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-500/30 shadow-red-500/40'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {isListening ? <Mic className="w-7 h-7 animate-bounce" /> : <Mic className="w-7 h-7" />}
                </button>

                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {isListening ? '🎙️ Listening... Bolna shuru kijiye (Hindi/English)' : 'Click to Speak (हिंदी या English में बोलें)'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Example: <i>&quot;Buy Nifty 24500 Call at 120 Target 160 Stoploss 95&quot;</i> ya <i>&quot;Buy karo HDFC ka 800 call phla target 12 aur sl 6 buy krna hai 8 se&quot;</i>
                  </p>
                </div>
              </div>
            )}

            {/* Textarea Input */}
            <div className="relative">
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Type or spoken trade text: e.g. BUY NIFTY 24500 CE @ 120 TGT 160 SL 95 INTRADAY"
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
              />
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Templates Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Templates:</span>
              {[
                'BUY NIFTY 24500 CE @ 120 TGT 160 SL 95',
                'BUY BANKNIFTY 51800 PE @ 310 TGT 390 SL 265',
                'RELIANCE BUY @ 2950 TGT 3020 SL 2910',
                'CRUDEOIL BUY @ 6150 TGT 6250 SL 6080'
              ].map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRawText(tpl)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono transition cursor-pointer"
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3: LIVE PARSED PREVIEW CARD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[11px] font-black">3</span>
                Step 3: Extracted Trade Parameters (Live Preview &amp; Edit)
              </span>
              <span className="text-[11px] text-slate-400">
                Directly fine-tune any field below if needed
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Action / Call Type */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Call Type</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setCallType('BUY')}
                      className={`flex-1 py-1.5 text-xs font-black transition cursor-pointer ${
                        callType === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setCallType('SELL')}
                      className={`flex-1 py-1.5 text-xs font-black transition cursor-pointer ${
                        callType === 'SELL' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                {/* Stock Symbol */}
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Stock / Symbol <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search stock..."
                      value={matchedStock ? matchedStock.symbol : stockSearchQuery}
                      onChange={e => {
                        setMatchedStock(null);
                        handleStockSearch(e.target.value);
                      }}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                        matchedStock
                          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-mono'
                          : 'border-amber-500 text-slate-900 dark:text-white'
                      }`}
                    />
                    {isStockSearching && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 top-2.5 text-slate-400" />
                    )}
                  </div>
                  {/* Stock drop down if user wants to change */}
                  {stockSearchQuery && !matchedStock && stocks.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {stocks.slice(0, 8).map(st => (
                        <div
                          key={st._id || st.id}
                          onClick={() => {
                            setMatchedStock(st);
                            setStockSearchQuery('');
                          }}
                          className="px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-bold font-mono"
                        >
                          {st.symbol} <span className="text-[10px] text-slate-400 font-normal">({st.name})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Strike Price & Option Type (If Option) */}
                {selectedSegment === 'OPTION' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Option Contract <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-1">
                      <input
                        type="number"
                        placeholder="Strike (e.g. 24500)"
                        value={strikePrice}
                        onChange={e => setStrikePrice(e.target.value)}
                        className="w-2/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono font-bold"
                      />
                      <select
                        value={optionType}
                        onChange={e => setOptionType(e.target.value as any)}
                        className="w-1/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-1 py-1.5 text-xs font-bold"
                      >
                        <option value="">--</option>
                        <option value="CE">CE</option>
                        <option value="PE">PE</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Expiry Date (If Option or Future) */}
                {(selectedSegment === 'OPTION' || selectedSegment === 'FUTURE') && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                )}

                {/* Entry Price & Entry Type */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Entry Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      step="any"
                      placeholder="Entry"
                      value={entryPrice}
                      onChange={e => setEntryPrice(e.target.value)}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono font-bold"
                    />
                    <select
                      value={entryType}
                      onChange={e => setEntryType(e.target.value as any)}
                      className="w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-1 py-1.5 text-[10px] font-bold"
                    >
                      <option value="AT CMP">AT CMP</option>
                      <option value="ABOVE">ABOVE</option>
                      <option value="BELOW">BELOW</option>
                    </select>
                  </div>
                </div>

                {/* Target 1 */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-emerald-600 block mb-1">
                    Target 1 (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Target 1"
                    value={target1}
                    onChange={e => setTarget1(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>

                {/* Target 2 */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Target 2 (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Target 2"
                    value={target2}
                    onChange={e => setTarget2(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>

                {/* Stop Loss */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-600 block mb-1">
                    Stop Loss (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Stoploss"
                    value={stoploss}
                    onChange={e => setStoploss(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-rose-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL VALIDATION & PRE-FLIGHT CHECKLIST BAR */}
          <div className="space-y-2">
            {/* Case A: Segment Mismatch Banner with 1-Click Fix */}
            {segmentMismatch && (
              <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold text-rose-700 dark:text-rose-400">
                      Segment Mismatch Detected
                    </div>
                    <p className="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">
                      {segmentMismatch.message}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSegment(segmentMismatch.recommendedSegment as any);
                    setSelectedPlanIds([]);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition shrink-0 cursor-pointer"
                >
                  ⚡ Switch to {segmentMismatch.recommendedSegment}
                </button>
              </div>
            )}

            {/* Case B: Pre-Flight Parameter Verification Chips */}
            <div className="bg-slate-100/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
                  Pre-Dispatch Parameter Check
                </span>
                {isReadyToDispatch ? (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ready for Instant Dispatch
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Complete pending items below
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  preflightChecklist.segmentSelected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {preflightChecklist.segmentSelected ? '✓ Segment' : '✗ Select Segment'}
                </span>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  preflightChecklist.planSelected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {preflightChecklist.planSelected ? `✓ Plan (${selectedPlanIds.length})` : '✗ Select Plan'}
                </span>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  preflightChecklist.stockSelected
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {preflightChecklist.stockSelected ? `✓ ${matchedStock.symbol}` : '✗ Select Stock'}
                </span>

                {selectedSegment === 'OPTION' && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                    preflightChecklist.optionContractValid
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {preflightChecklist.optionContractValid ? `✓ ${strikePrice} ${optionType}` : '✗ Strike / CE-PE'}
                  </span>
                )}

                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                  preflightChecklist.pricesEntered
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {preflightChecklist.pricesEntered ? `✓ Entry / TGT / SL` : '✗ Entry / TGT / SL'}
                </span>

                {preflightChecklist.priceLogicError && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                    ⚠ {preflightChecklist.priceLogicError}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer - ALWAYS VISIBLE AT BOTTOM */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 hidden sm:flex">
            <Info className="w-3.5 h-3.5" />
            <span>Signal will be instantly broadcasted via Telegram &amp; SMS.</span>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isReadyToDispatch || isSubmitting}
              onClick={handleDispatchTrade}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center space-x-2 shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Dispatching...</span>
                </>
              ) : isReadyToDispatch ? (
                <>
                  <Send className="w-4 h-4 fill-current text-slate-950" />
                  <span>🚀 Dispatch Trade Now</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-slate-950" />
                  <span>Complete Parameters</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickTradeModal;
