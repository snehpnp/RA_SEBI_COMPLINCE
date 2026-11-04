/**
 * SEBI Regulatory Compliance Prohibited Keywords & Misleading Pitch Scanner
 * Designed for SEBI Research Analyst (RA) Regulations & Grievance Prevention
 */

export interface DetectedKeyword {
  keyword: string;
  category: 'ASSURED_PROFIT' | 'COMMITMENT_PROMISE' | 'BROKER_ACCOUNT_HANDLING' | 'UNAUTHORIZED_PAYMENT';
  count: number;
  severity: 'HIGH' | 'CRITICAL';
}

export interface ScanResult {
  isFlagged: boolean;
  flaggedCount: number;
  detectedKeywords: DetectedKeyword[];
  highlightedText: string;
  complianceScore: 'COMPLIANT' | 'VIOLATION_FLAGGED';
}

// Exhaustive dictionary of words prohibited by SEBI for RAs
export const SEBI_PROHIBITED_KEYWORD_PATTERNS = [
  // 1. Assured Return / Profit Sharing (Strictly prohibited by SEBI)
  { phrase: 'profit sharing', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'profit share', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'profit-sharing', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'guaranteed return', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'guaranteed profit', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'guaranteed', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'sure shot', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'sureshot', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'sure-shot', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: '100% profit', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: '100% return', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: '100% accuracy', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: '100% accurate', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'pakka profit', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'pucca profit', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'no loss', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'zero loss', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'loss recovery', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'loss recover', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'fixed return', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'fixed profit', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'jackpot call', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'double return', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'capital double', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: '100% गारंटी', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'गारंटी', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'प्रॉफिट शेयरिंग', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'प्रॉफिट', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'लॉस रिकवरी', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'लॉस', category: 'ASSURED_PROFIT', severity: 'HIGH' },
  { phrase: 'पक्का प्रॉफिट', category: 'ASSURED_PROFIT', severity: 'CRITICAL' },
  { phrase: 'कमिटमेंट', category: 'COMMITMENT_PROMISE', severity: 'HIGH' },
  { phrase: 'अकाउंट हैंडलिंग', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'ब्रोकर हैंडलिंग', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },

  // 2. Commitment / Fake Promises
  { phrase: 'commitment', category: 'COMMITMENT_PROMISE', severity: 'HIGH' },
  { phrase: 'fake commitment', category: 'COMMITMENT_PROMISE', severity: 'CRITICAL' },
  { phrase: 'mera commitment', category: 'COMMITMENT_PROMISE', severity: 'CRITICAL' },
  { phrase: 'promise', category: 'COMMITMENT_PROMISE', severity: 'HIGH' },
  { phrase: 'capital safe', category: 'COMMITMENT_PROMISE', severity: 'HIGH' },

  // 3. Broker / Demat Account Handling (Severe SEBI violation for RAs)
  { phrase: 'broker handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'broker-handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'account handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'account-handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'demat handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'demat-handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'id password', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'id-password', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'demat login', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'credentials', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'portfolio handling', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'hum trade karenge', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'hum trade dalenge', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },
  { phrase: 'trading account access', category: 'BROKER_ACCOUNT_HANDLING', severity: 'CRITICAL' },

  // 4. Unauthorized Payment & Transfers
  { phrase: 'personal account', category: 'UNAUTHORIZED_PAYMENT', severity: 'CRITICAL' },
  { phrase: 'cash payment', category: 'UNAUTHORIZED_PAYMENT', severity: 'CRITICAL' },
  { phrase: 'extra commission', category: 'UNAUTHORIZED_PAYMENT', severity: 'HIGH' }
] as const;

export const scanTextForSebiViolations = (text: string): ScanResult => {
  if (!text || typeof text !== 'string') {
    return {
      isFlagged: false,
      flaggedCount: 0,
      detectedKeywords: [],
      highlightedText: '',
      complianceScore: 'COMPLIANT'
    };
  }

  const keywordCounts: Record<string, DetectedKeyword> = {};
  let totalFlagged = 0;

  // Scan against all patterns
  for (const item of SEBI_PROHIBITED_KEYWORD_PATTERNS) {
    const escaped = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isDevanagari = /[\u0900-\u097F]/.test(item.phrase);
    const regex = isDevanagari
      ? new RegExp(`(?:^|[^a-zA-Z0-9\u0900-\u097F])(${escaped})(?:[^a-zA-Z0-9\u0900-\u097F]|$)`, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi');

    let matchCount = 0;
    if (isDevanagari) {
      const allMatches = Array.from(text.matchAll(regex));
      matchCount = allMatches.length;
    } else {
      const matches = text.match(regex);
      matchCount = matches ? matches.length : 0;
    }

    if (matchCount > 0) {
      totalFlagged += matchCount;
      if (!keywordCounts[item.phrase]) {
        keywordCounts[item.phrase] = {
          keyword: item.phrase,
          category: item.category as any,
          count: matchCount,
          severity: item.severity as any
        };
      } else {
        keywordCounts[item.phrase].count += matchCount;
      }
    }
  }

  const detectedKeywords = Object.values(keywordCounts);

  // Generate HTML-ready highlighted text
  let highlighted = text;
  for (const item of detectedKeywords) {
    const escaped = item.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isDevanagari = /[\u0900-\u097F]/.test(item.keyword);
    const regex = isDevanagari
      ? new RegExp(`(${escaped})`, 'gi')
      : new RegExp(`(\\b${escaped}\\b)`, 'gi');
    highlighted = highlighted.replace(
      regex,
      `<mark class="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 font-black px-1.5 py-0.5 rounded shadow-xs" title="SEBI Prohibited Term: ${item.category}">$1</mark>`
    );
  }

  return {
    isFlagged: detectedKeywords.length > 0,
    flaggedCount: totalFlagged,
    detectedKeywords,
    highlightedText: highlighted,
    complianceScore: detectedKeywords.length > 0 ? 'VIOLATION_FLAGGED' : 'COMPLIANT'
  };
};

export interface ConversationTurnItem {
  speaker: 'EXECUTIVE' | 'CLIENT';
  speakerName: string;
  text: string;
  highlightedText: string;
  detectedKeywords: DetectedKeyword[];
  timestamp: string;
}

export const buildConversationTurns = (
  rawText: string,
  segments: { time: string; text: string }[] = [],
  staffName: string = 'Advisory Executive',
  clientName: string = 'Client'
): ConversationTurnItem[] => {
  const turns: ConversationTurnItem[] = [];

  // Check if text already has speaker labels (e.g. "Executive:", "Client:", "Staff:")
  if (rawText && /(Executive|Staff|Client|Advisor):/i.test(rawText)) {
    const lines = rawText.split(/\n+/).filter(l => l.trim().length > 0);
    let currentSpeaker: 'EXECUTIVE' | 'CLIENT' = 'EXECUTIVE';
    let secCounter = 0;

    for (const line of lines) {
      let text = line.trim();
      let speakerName = staffName;
      let sp: 'EXECUTIVE' | 'CLIENT' = 'EXECUTIVE';

      if (/^(Client|Investor):/i.test(text)) {
        sp = 'CLIENT';
        speakerName = clientName;
        text = text.replace(/^(Client|Investor):\s*/i, '');
      } else if (/^(Executive|Staff|Advisor):/i.test(text)) {
        sp = 'EXECUTIVE';
        speakerName = staffName;
        text = text.replace(/^(Executive|Staff|Advisor):\s*/i, '');
      } else {
        sp = currentSpeaker;
        speakerName = sp === 'EXECUTIVE' ? staffName : clientName;
      }
      currentSpeaker = sp;

      const scan = scanTextForSebiViolations(text);
      const m = Math.floor(secCounter / 60).toString().padStart(2, '0');
      const s = (secCounter % 60).toString().padStart(2, '0');
      secCounter += 8;

      turns.push({
        speaker: sp,
        speakerName,
        text,
        highlightedText: scan.highlightedText || text,
        detectedKeywords: scan.detectedKeywords,
        timestamp: `${m}:${s}`
      });
    }

    if (turns.length > 0) return turns;
  }

  // If segments from audio transcription are available
  if (segments && segments.length > 0) {
    segments.forEach((seg, idx) => {
      const isExec = idx % 2 === 0;
      const sp: 'EXECUTIVE' | 'CLIENT' = isExec ? 'EXECUTIVE' : 'CLIENT';
      const speakerName = isExec ? staffName : clientName;
      const scan = scanTextForSebiViolations(seg.text);

      turns.push({
        speaker: sp,
        speakerName,
        text: seg.text,
        highlightedText: scan.highlightedText || seg.text,
        detectedKeywords: scan.detectedKeywords,
        timestamp: seg.time || '00:00'
      });
    });
    return turns;
  }

  // Fallback: Smart sentence chunking into Executive vs Client turns
  if (rawText && rawText.trim()) {
    const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
    let sec = 0;
    sentences.forEach((sent, idx) => {
      const isExec = idx % 2 === 0;
      const sp: 'EXECUTIVE' | 'CLIENT' = isExec ? 'EXECUTIVE' : 'CLIENT';
      const speakerName = isExec ? staffName : clientName;
      const trimmed = sent.trim();
      const scan = scanTextForSebiViolations(trimmed);
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      sec += 6;

      turns.push({
        speaker: sp,
        speakerName,
        text: trimmed,
        highlightedText: scan.highlightedText || trimmed,
        detectedKeywords: scan.detectedKeywords,
        timestamp: `${m}:${s}`
      });
    });
    return turns;
  }

  return [];
};
