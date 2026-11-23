import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Payment, Client, Tenant, Plan, PlanCategory, Subscription, SystemSetting, PlatformInvoice, PlatformBillingConfig, dynamicDb } from '../config/db';

// Helper to convert number to words (simple version for INR)
function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString().replace(/[\, ]/g, '') as any) != parseFloat(num as any)) return 'not a number';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
  return str.trim() + ' Only';
}

// Indian currency formatting: ₹ 15,000.00
function formatInr(amount: number): string {
  const parts = Number(amount || 0).toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  const isNegative = integerPart.startsWith('-');
  if (isNegative) integerPart = integerPart.substring(1);
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') lastThree = ',' + lastThree;
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return (isNegative ? '- ' : '') + '₹ ' + formattedInt + '.' + decimalPart;
}

// Monogram letters from company name
function getInitials(name?: string): string {
  if (!name) return 'RA';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
}

/**
 * Safely resolves the logo image file path on disk
 */
export const resolveLogoPath = (logoUrl?: string | null): string | null => {
  if (!logoUrl || typeof logoUrl !== 'string') return null;
  const trimmed = logoUrl.trim();
  if (!trimmed) return null;

  let cleanPath = trimmed;
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    try {
      const parsed = new URL(cleanPath);
      cleanPath = parsed.pathname;
    } catch { }
  }

  cleanPath = cleanPath.replace(/^[/\\]+/, '');
  const fileName = path.basename(cleanPath);

  const candidatePaths = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(process.cwd(), '../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(process.cwd(), 'uploads/branding', fileName),
    path.resolve(process.cwd(), '../uploads/branding', fileName),
    path.resolve(__dirname, '../../../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(__dirname, '../../../uploads/branding', fileName),
    path.resolve(__dirname, '../../uploads', cleanPath.replace(/^uploads[/\\]?/, '')),
    path.resolve(__dirname, '../../uploads/branding', fileName),
    path.resolve(process.cwd(), '../frontend/public', cleanPath.replace(/^frontend[/\\]public[/\\]?/, '')),
    path.resolve(process.cwd(), '../frontend/public', fileName),
    path.resolve(process.cwd(), 'frontend/public', fileName),
    path.resolve(__dirname, '../../../frontend/public', fileName),
    path.resolve(__dirname, '../../frontend/public', fileName),
    path.resolve('d:/RA_SEBI_COMPLINCE/uploads/branding', fileName),
    path.resolve('d:/RA_SEBI_COMPLINCE/frontend/public', fileName)
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate).toLowerCase();
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          return candidate;
        }
      }
    } catch { }
  }

  return null;
};

export const generateInvoicePdf = async (
  paymentId: string,
  options?: {
    isCancelledWatermark?: boolean;
    watermarkText?: string;
    creditNoteMode?: boolean;
    cancellationDetails?: {
      cancellationType?: string;
      effectiveDate?: Date | string;
      totalDays?: number;
      daysUsed?: number;
      remainingDays?: number;
      refundAmount?: number;
      refundBaseAmount?: number;
      refundGstAmount?: number;
      refundMode?: string;
      creditNoteNumber?: string;
      remarks?: string;
      originalStartDate?: Date | string;
      originalEndDate?: Date | string;
      originalAmount?: number;
    };
  }
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      let payment: any = null;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(paymentId).trim());

      if (isObjectId) {
        try {
          payment = await Payment.findById(paymentId).populate('coupon').populate('couponId').lean();
        } catch { }
        if (!payment && dynamicDb?.Payment) {
          try {
            payment = await dynamicDb.Payment.findById(paymentId).populate('coupon').populate('couponId').lean();
          } catch { }
        }
      }

      if (!payment) {
        const orConditions: any[] = [{ transactionRef: paymentId }, { gatewayPaymentId: paymentId }];
        if (isObjectId) orConditions.unshift({ _id: paymentId });
        try {
          payment = await Payment.findOne({ $or: orConditions }).populate('coupon').populate('couponId').lean();
        } catch { }
        if (!payment && dynamicDb?.Payment) {
          try {
            payment = await dynamicDb.Payment.findOne({ $or: orConditions }).populate('coupon').populate('couponId').lean();
          } catch { }
        }
      }

      if (!payment) {
        return reject(new Error('Payment record not found'));
      }

      let client: any = null;
      if (payment.clientId) {
        try {
          client = await Client.findById(payment.clientId).populate('user').populate('profile').lean();
        } catch { }
        if (!client && dynamicDb?.Client) {
          try {
            client = await dynamicDb.Client.findById(payment.clientId).populate('user').populate('profile').lean();
          } catch { }
        }
      }
      if (!client) {
        client = {
          name: payment.clientName,
          email: payment.clientEmail || '',
          mobile: payment.clientPhone || '',
          pan: payment.clientPan || 'N/A',
          profile: { addressLine1: 'India', state: 'MADHYA PRADESH', city: 'N/A', zipCode: 'N/A' }
        };
      }

      let tenant: any = null;
      if (payment.tenantId) {
        try {
          tenant = await Tenant.findById(payment.tenantId).lean();
        } catch { }
        if (!tenant && dynamicDb?.Tenant) {
          try {
            tenant = await dynamicDb.Tenant.findById(payment.tenantId).lean();
          } catch { }
        }
      }
      if (!tenant) {
        try {
          tenant = await Tenant.findOne({ deletedAt: null }).lean();
        } catch { }
      }
      if (!tenant && dynamicDb?.Tenant) {
        try {
          tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
        } catch { }
      }
      if (!tenant) {
        try {
          tenant = await Tenant.findOne().lean();
        } catch { }
      }
      if (!tenant) {
        tenant = {
          companyName: 'Alpha Research Partners',
          address: 'India',
          email: 'support@alpharesearch.com',
          mobile: '9999999999',
          sebiRegistration: 'INH000001234'
        };
      }

      // Check SystemSetting if logoUrl is not populated on tenant
      if (!tenant.logoUrl) {
        try {
          const sysSetting: any = await SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() ||
            (dynamicDb?.SystemSetting ? await dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() : null);
          if (sysSetting && sysSetting.value) {
            const parsed = typeof sysSetting.value === 'string' ? JSON.parse(sysSetting.value) : sysSetting.value;
            if (parsed.logoUrl) tenant.logoUrl = parsed.logoUrl;
          }
        } catch { }
      }

      let categoryName = '';
      let segments = '';
      let planObj: any = null;

      if (payment.planId) {
        try {
          planObj = await Plan.findById(payment.planId).populate('categoryId').lean() ||
            (dynamicDb?.Plan ? await dynamicDb.Plan.findById(payment.planId).populate('categoryId').lean() : null);
        } catch { }
      }

      if (planObj) {
        if (planObj.categoryId && typeof planObj.categoryId === 'object') {
          categoryName = planObj.categoryId.name || '';
          segments = planObj.researchSegments || planObj.categoryId.segments || '';
        } else if (planObj.categoryId) {
          try {
            const cat: any = await PlanCategory.findById(planObj.categoryId).lean() ||
              (dynamicDb?.PlanCategory ? await dynamicDb.PlanCategory.findById(planObj.categoryId).lean() : null);
            if (cat) {
              categoryName = cat.name || '';
              segments = planObj.researchSegments || cat.segments || '';
            }
          } catch { }
        }
        if (!segments && planObj.researchSegments) {
          segments = planObj.researchSegments;
        }
      }

      if (!categoryName && payment.planCategory) categoryName = payment.planCategory;
      if (!categoryName && payment.categoryName) categoryName = payment.categoryName;
      if (!segments && payment.segments) segments = payment.segments;
      if (!segments && payment.researchSegments) segments = payment.researchSegments;

      // Graceful fallback: If categoryName not yet found, extract from planName or use generic
      if (!categoryName) {
        if (payment.planName || planObj?.name) {
          const raw = (payment.planName || planObj?.name || '').trim();
          categoryName = raw.split(' - ')[0] || raw;
        } else {
          categoryName = 'Research Services';
        }
      }
      if (!segments) {
        segments = 'EQUITY, DERIVATIVE';
      }

      // Resolve Start Date and End Date from Subscription record or payment
      let matchedSubscription: any = null;
      let subStartDate: Date | null = null;
      let subEndDate: Date | null = null;

      if (payment.subscriptionId) {
        try {
          const sub: any = await Subscription.findById(payment.subscriptionId).lean() ||
            (dynamicDb?.Subscription ? await dynamicDb.Subscription.findById(payment.subscriptionId).lean() : null);
          if (sub) {
            matchedSubscription = sub;
            if (sub.startDate) subStartDate = new Date(sub.startDate);
            if (sub.endDate) subEndDate = new Date(sub.endDate);
          }
        } catch { }
      }

      const validityDays = Number(payment.planValidityDays || (planObj?.durationMonths ? planObj.durationMonths * 30 : 30));
      const paymentBaseDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.createdAt || Date.now());

      // If subscriptionId was not explicitly set on payment, find the BEST matching subscription for THIS payment
      if (!subStartDate && payment.clientId && payment.planId) {
        try {
          const query = {
            clientId: payment.clientId,
            planId: payment.planId
          };
          const allSubs: any[] = (await Subscription.find(query).sort({ createdAt: 1 }).lean() ||
            (dynamicDb?.Subscription ? await dynamicDb.Subscription.find(query).sort({ createdAt: 1 }).lean() : [])) as any[];

          if (allSubs && allSubs.length > 0) {
            const payAmount = Number(payment.amount || 0);
            const payCreatedAt = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
            const payDate = payment.paymentDate ? new Date(payment.paymentDate).getTime() : 0;

            let bestSub: any = null;
            let bestScore = -1;

            for (const s of allSubs) {
              let score = 0;
              const sStart = s.startDate ? new Date(s.startDate).getTime() : 0;
              const sEnd = s.endDate ? new Date(s.endDate).getTime() : 0;
              const sDays = (sStart && sEnd) ? Math.round((sEnd - sStart) / (1000 * 60 * 60 * 24)) : 0;
              const sTotal = Number(s.amountTotal || 0);
              const sCreated = s.createdAt ? new Date(s.createdAt).getTime() : 0;

              // 1. Duration / validity match (crucial: 8-day vs 15-day)
              if (validityDays > 0 && sDays > 0) {
                if (sDays === validityDays) {
                  score += 50;
                } else if (Math.abs(sDays - validityDays) <= 1) {
                  score += 35;
                } else {
                  // Heavy penalty if duration doesn't match the plan validity days
                  score -= 60;
                }
              }

              // 2. Amount match
              if (payAmount > 0 && sTotal > 0) {
                if (Math.abs(sTotal - payAmount) < 2) {
                  score += 30;
                }
              }

              // 3. Creation timestamp proximity
              if (payCreatedAt > 0 && sCreated > 0) {
                const diffSec = Math.abs(payCreatedAt - sCreated) / 1000;
                if (diffSec < 120) {
                  score += 30;
                } else if (diffSec < 3600) {
                  score += 15;
                }
              }

              // 4. Start date matching payment date
              if (payDate > 0 && sStart > 0) {
                const payDateStr = new Date(payDate).toISOString().split('T')[0];
                const sStartStr = new Date(sStart).toISOString().split('T')[0];
                if (payDateStr === sStartStr) {
                  score += 25;
                }
              }

              if (score > bestScore) {
                bestScore = score;
                bestSub = s;
              }
            }

            // Only accept if score > 0 (meaning a genuine match was found)
            if (bestSub && bestScore > 0) {
              matchedSubscription = bestSub;
              if (bestSub.startDate) subStartDate = new Date(bestSub.startDate);
              if (bestSub.endDate) subEndDate = new Date(bestSub.endDate);

              // Auto-backfill subscriptionId on payment document for subsequent instant queries
              try {
                if (payment._id && bestSub._id) {
                  (dynamicDb?.Payment || Payment).findByIdAndUpdate(payment._id, { $set: { subscriptionId: bestSub._id } }).catch(() => { });
                }
              } catch { }
            }
          }
        } catch { }
      }

      // If no valid subscription found or matched, use paymentBaseDate and validityDays directly
      const startDateFormatted = subStartDate ? subStartDate.toLocaleDateString('en-GB') : paymentBaseDate.toLocaleDateString('en-GB');
      const endDateFormatted = subEndDate
        ? subEndDate.toLocaleDateString('en-GB')
        : new Date(paymentBaseDate.getTime() + validityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB');

      // Resolve cancellation & refund details (from options or auto-extracted from payment/subscription)
      let cancData: any = options?.cancellationDetails || null;

      if (!cancData && (options?.creditNoteMode || payment.isRefunded || payment.refundedAmount > 0 || payment.creditNoteNumber || matchedSubscription?.status === 'CANCELLED' || matchedSubscription?.cancellationType)) {
        const sub = matchedSubscription;
        const sDate = sub?.startDate ? new Date(sub.startDate) : (payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.createdAt || Date.now()));
        const eDate = sub?.originalEndDate ? new Date(sub.originalEndDate) : (sub?.endDate ? new Date(sub.endDate) : new Date(sDate.getTime() + validityDays * 24 * 60 * 60 * 1000));
        const effDate = sub?.cancellationEffectiveDate ? new Date(sub.cancellationEffectiveDate) : (payment.refundDate ? new Date(payment.refundDate) : new Date());

        const totDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
        let dUsed = 0;
        if (effDate < sDate) dUsed = 0;
        else if (effDate >= eDate) dUsed = totDays;
        else dUsed = Math.max(1, Math.round((effDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
        const remDays = Math.max(0, totDays - dUsed);

        cancData = {
          cancellationType: sub?.cancellationType || (payment.isRefunded ? 'CANCEL_AND_REFUND' : 'ONLY_CANCEL'),
          effectiveDate: effDate,
          totalDays: totDays,
          daysUsed: dUsed,
          remainingDays: remDays,
          refundAmount: Number(payment.refundedAmount || sub?.refundAmount || 0),
          refundBaseAmount: Number(payment.refundedBaseAmount || sub?.refundBaseAmount || 0),
          refundGstAmount: Number(payment.refundedGstAmount || sub?.refundGstAmount || 0),
          refundMode: payment.refundMode || sub?.refundMode || 'WITH_GST',
          creditNoteNumber: payment.creditNoteNumber || sub?.creditNoteNumber || null,
          remarks: sub?.refundRemarks || 'Approved subscription cancellation & pro-rata fee refund.',
          originalStartDate: sDate,
          originalEndDate: eDate,
          originalAmount: Number(sub?.amountTotal || payment.amount || 0)
        };
      }

      const doc = new PDFDocument({ margin: 30, size: 'A4', compress: false });
      const buffers: Buffer[] = [];

      // Resolve TrueType fonts for full Unicode support (e.g. ₹ Indian Rupee sign)
      const resolveFont = (filenames: string[]): string | null => {
        for (const filename of filenames) {
          const candidatePaths = [
            path.resolve(__dirname, '../../assets/fonts', filename),
            path.resolve(__dirname, '../../../assets/fonts', filename),
            path.resolve(process.cwd(), 'assets/fonts', filename),
            path.resolve(process.cwd(), 'backend/assets/fonts', filename),
            `C:\\Windows\\Fonts\\${filename}`,
            `C:\\Windows\\Fonts\\${filename.toLowerCase()}`,
            `C:\\Windows\\Fonts\\${filename.toUpperCase()}`
          ];
          for (const p of candidatePaths) {
            try {
              if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
            } catch { }
          }
        }
        return null;
      };

      const regularFontPath = resolveFont(['arial.ttf', 'Arial.ttf']);
      const boldFontPath = resolveFont(['arialbd.ttf', 'ARIALBD.TTF', 'Arial-Bold.ttf', 'ArialBold.ttf']);
      const italicFontPath = resolveFont(['ariali.ttf', 'ARIALI.TTF', 'Arial-Italic.ttf']);

      let regularFont = 'Helvetica';
      let boldFont = 'Helvetica-Bold';
      let italicFont = 'Helvetica-Oblique';

      if (regularFontPath) {
        try {
          doc.registerFont('App-Regular', regularFontPath);
          regularFont = 'App-Regular';
        } catch { }
      }
      if (boldFontPath) {
        try {
          doc.registerFont('App-Bold', boldFontPath);
          boldFont = 'App-Bold';
        } catch { }
      }
      if (italicFontPath) {
        try {
          doc.registerFont('App-Italic', italicFontPath);
          italicFont = 'App-Italic';
        } catch { }
      }

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- CALCULATE TAXES & DISCOUNT ---
      const totalAmount = Number(payment.amount || 0);
      let couponObj: any = payment.coupon || payment.couponId;
      if (payment.couponId && (!couponObj || typeof couponObj !== 'object' || !couponObj.code)) {
        try {
          couponObj = await dynamicDb.Coupon.findById(payment.couponId).lean();
        } catch { }
      }

      const couponCodeText = couponObj?.code || payment.coupon?.code || payment.couponCode || '';

      if (!planObj && payment.planId) {
        try {
          planObj = await Plan.findById(payment.planId).lean() || (dynamicDb?.Plan ? await dynamicDb.Plan.findById(payment.planId).lean() : null);
        } catch { }
      }

      const fullPlanPrice = Number(planObj?.amount || planObj?.price || 0);

      // Determine raw discount
      let rawDiscount = Number(payment.discountApplied || payment.discount || 0);

      // Determine if GST is ENABLED, and whether it is INCLUSIVE or EXCLUSIVE
      let isGstEnabled = true;
      if (payment.gstEnabled !== undefined && payment.gstEnabled !== null) {
        isGstEnabled = Boolean(payment.gstEnabled);
      } else if (String(payment.transactionRef || '').toLowerCase().includes('gst_disable') || String(payment.remarks || '').toLowerCase().includes('gst_disable')) {
        isGstEnabled = false;
      } else {
        isGstEnabled = tenant.gstEnabled !== false;
      }

      const tenantGstVal = (tenant.gst || tenant.gstNumber || tenant.gstin || '').trim();
      // If tenant has no valid 15-char GSTIN, GST is disabled by default
      if (!tenantGstVal || tenantGstVal.length < 15) {
        isGstEnabled = false;
      }

      let isGstInclusive = payment.gstCalculationType === 'INCLUSIVE' || tenant.gstCalculationType === 'INCLUSIVE';
      if (!isGstInclusive && fullPlanPrice > 0 && totalAmount > 0) {
        if (Math.abs(totalAmount - (fullPlanPrice - rawDiscount)) < 2) {
          isGstInclusive = true;
        }
      }

      let grossBase = 0;
      let baseDiscount = 0;
      let taxableValue = 0;
      let totalGst = 0;
      let netInvoiceTotal = totalAmount;

      if (rawDiscount > 0) {
        baseDiscount = rawDiscount;
      } else if (couponObj?.discountValue) {
        if (couponObj.discountType === 'PERCENTAGE') {
          baseDiscount = Number((((fullPlanPrice || totalAmount) * couponObj.discountValue) / 100).toFixed(2));
          if (couponObj.percentageType === 'CAPPED' && couponObj.maxDiscountValue && baseDiscount > couponObj.maxDiscountValue) {
            baseDiscount = couponObj.maxDiscountValue;
          }
        } else {
          baseDiscount = Number(couponObj.discountValue);
        }
      }

      if (!isGstEnabled) {
        // GST DISABLED: Direct Plan Price without tax (0% Non-GST)
        netInvoiceTotal = totalAmount;
        taxableValue = totalAmount;
        totalGst = 0;
        grossBase = Number((totalAmount + baseDiscount).toFixed(2));
      } else {
        // GST ENABLED (Both Inclusive & Exclusive received amounts decompose accurately)
        netInvoiceTotal = totalAmount;
        taxableValue = Number((payment.baseAmount || (netInvoiceTotal / 1.18)).toFixed(2));
        totalGst = Number((payment.gstAmount || (netInvoiceTotal - taxableValue)).toFixed(2));
        grossBase = Number((taxableValue + baseDiscount).toFixed(2));
      }

      const stateCodes: Record<string, string> = {
        'JAMMU AND KASHMIR': '01', 'HIMACHAL PRADESH': '02', 'PUNJAB': '03', 'CHANDIGARH': '04', 'UTTARAKHAND': '05',
        'HARYANA': '06', 'DELHI': '07', 'RAJASTHAN': '08', 'UTTAR PRADESH': '09', 'BIHAR': '10', 'SIKKIM': '11',
        'ARUNACHAL PRADESH': '12', 'NAGALAND': '13', 'MANIPUR': '14', 'MIZORAM': '15', 'TRIPURA': '16', 'MEGHALAYA': '17',
        'ASSAM': '18', 'WEST BENGAL': '19', 'JHARKHAND': '20', 'ODISHA': '21', 'CHHATTISGARH': '22', 'MADHYA PRADESH': '23',
        'GUJARAT': '24', 'DAMAN AND DIU': '25', 'DADRA AND NAGAR HAVELI': '26', 'MAHARASHTRA': '27', 'KARNATAKA': '29',
        'GOA': '30', 'LAKSHADWEEP': '31', 'KERALA': '32', 'TAMIL NADU': '33', 'PUDUCHERRY': '34', 'ANDAMAN AND NICOBAR ISLANDS': '35',
        'TELANGANA': '36', 'ANDHRA PRADESH': '37', 'LADAKH': '38',
        'MP': '23', 'MH': '27', 'DL': '07', 'GA': '30', 'UP': '09', 'HR': '06', 'RJ': '08', 'KA': '29', 'TN': '33', 'TS': '36', 'AP': '37', 'GJ': '24', 'WB': '19'
      };

      const resolveStateCode = (st?: string | null): string => {
        if (!st) return '';
        const clean = st.trim().toUpperCase();
        if (stateCodes[clean]) return stateCodes[clean];
        const noSpace = clean.replace(/[^A-Z]/g, '');
        for (const [k, v] of Object.entries(stateCodes)) {
          if (k.replace(/[^A-Z]/g, '') === noSpace) return v;
        }
        return '';
      };

      let displayClientState = (client.profile?.state || client.state || 'MADHYA PRADESH').trim().toUpperCase();
      let displayTenantState = (tenant.state ? tenant.state.trim().toUpperCase() : (tenant.address?.split(',').pop()?.trim().toUpperCase() || 'MAHARASHTRA'));

      const normClientState = displayClientState.replace(/[^A-Z]/g, '');
      const normTenantState = displayTenantState.replace(/[^A-Z]/g, '');
      const isIntraState = normClientState === normTenantState && normClientState !== '';

      let cgst = 0, sgst = 0, igst = 0;
      if (isIntraState) {
        cgst = Number((totalGst / 2).toFixed(2));
        sgst = Number((totalGst - cgst).toFixed(2));
      } else {
        igst = totalGst;
      }

      const clientStateCode = resolveStateCode(displayClientState);
      const tenantStateCode = resolveStateCode(displayTenantState) || '27';

      const clientFullName = (
        client.name ||
        (client.user ? `${client.user.firstName || ''} ${client.user.lastName || ''}`.trim() : '') ||
        payment.clientName ||
        'Valued Client'
      );
      const clientEmail = client.user?.email || client.email || payment.clientEmail || 'N/A';
      const clientMobile = client.mobile || client.user?.mobile || payment.clientPhone || 'N/A';
      const clientPan = client.pan || client.user?.pan || 'N/A';
      const clientPincode = client.profile?.zipCode || client.zipCode || '';
      const clientCity = client.profile?.city || client.city || '';
      const clientAddressRaw = client.profile?.addressLine1
        ? `${client.profile.addressLine1}${client.profile.addressLine2 ? ', ' + client.profile.addressLine2 : ''}`
        : (client.address || 'India');

      let clientAddressDisplay = clientAddressRaw;
      if (clientCity && clientCity !== 'N/A' && !clientAddressDisplay.includes(clientCity)) {
        clientAddressDisplay = `${clientAddressDisplay}, ${clientCity}`;
      }
      if (clientPincode && clientPincode !== 'N/A' && !clientAddressDisplay.includes(clientPincode)) {
        clientAddressDisplay = `${clientAddressDisplay} - ${clientPincode}`;
      }

      const invoiceNo = payment.transactionRef ? `INV/${new Date().getFullYear()}/${String(payment.transactionRef).slice(-6).toUpperCase()}` : `INV/${new Date().getFullYear()}/001`;
      const invoiceDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-GB') : new Date(payment.createdAt || Date.now()).toLocaleDateString('en-GB');

      // ==========================================
      // 1. OUTER DOCUMENT BORDER
      // ==========================================
      doc.roundedRect(26, 26, 543, 755, 4).strokeColor('#CBD5E1').lineWidth(0.75).stroke();

      // ==========================================
      // 2. HEADER TOP ROW: LOGO & COMPANY INFO (Y: 34 to 90)
      // ==========================================
      const logoPath = resolveLogoPath(tenant.logoUrl);
      let renderedLogo = false;
      if (logoPath) {
        try {
          doc.image(logoPath, 36, 36, { fit: [140, 48] });
          renderedLogo = true;
        } catch { }
      }

      if (!renderedLogo) {
        // Render sleek monogram corporate badge
        const initials = getInitials(tenant.companyName);
        doc.roundedRect(36, 36, 44, 44, 5).fillColor('#0F2444').fill();
        doc.font(boldFont).fontSize(14).fillColor('#FFFFFF').text(initials, 36, 50, { width: 44, align: 'center' });

        doc.font(boldFont).fontSize(12.5).fillColor('#0F2444').text(tenant.companyName, 88, 39);
        doc.font(boldFont).fontSize(7.5).fillColor('#2563EB').text('SEBI REGISTERED RESEARCH ANALYST', 88, 55);
        doc.font(regularFont).fontSize(7).fillColor('#64748B').text('Financial Research Services', 88, 67);
      }

      // Right Side: Company Details
      const tenantGst = isGstEnabled ? (tenant.gst || tenant.gstin || '') : '';
      let tenantFullAddress = tenant.address || '';
      if (tenant.city && !tenantFullAddress.includes(tenant.city)) {
        tenantFullAddress = tenantFullAddress ? `${tenantFullAddress}, ${tenant.city}` : tenant.city;
      }
      if (tenant.state && !tenantFullAddress.includes(tenant.state)) {
        tenantFullAddress = tenantFullAddress ? `${tenantFullAddress}, ${tenant.state}` : tenant.state;
      }
      if (tenant.pincode && !tenantFullAddress.includes(tenant.pincode)) {
        tenantFullAddress = tenantFullAddress ? `${tenantFullAddress} - ${tenant.pincode}` : tenant.pincode;
      }
      if (!tenantFullAddress || tenantFullAddress.trim().length <= 2) {
        tenantFullAddress = `${displayTenantState}, India`;
      }
      doc.font(boldFont).fontSize(9).fillColor('#0F172A').text(tenant.companyName, 250, 36, { width: 310, align: 'right' });
      doc.font(regularFont).fontSize(7.5).fillColor('#475569').text(tenantFullAddress, 250, 48, { width: 310, align: 'right' });
      doc.text(`Email: ${tenant.email || 'support@research.com'}  |  Mobile: ${tenant.mobile || 'N/A'}`, 250, 60, { width: 310, align: 'right' });
      if (isGstEnabled && tenantGst) {
        doc.text(`SEBI Regn: ${tenant.sebiRegistration || 'INH000001234'}  |  PAN: ${tenant.pan || 'N/A'}  |  GSTIN: ${tenantGst}`, 250, 72, { width: 310, align: 'right' });
      } else {
        doc.text(`SEBI Regn: ${tenant.sebiRegistration || 'INH000001234'}  |  PAN: ${tenant.pan || 'N/A'}`, 250, 72, { width: 310, align: 'right' });
      }

      // Separator Line
      doc.moveTo(26, 92).lineTo(569, 92).strokeColor('#E2E8F0').lineWidth(0.75).stroke();

      // ==========================================
      // 3. TAX INVOICE RIBBON (Y: 98 to 122)
      // ==========================================
      const isCancelledDoc = Boolean(options?.isCancelledWatermark || options?.creditNoteMode || payment.isRefunded);
      let ribbonTitle = isGstEnabled ? 'TAX INVOICE' : 'INVOICE / BILL OF SUPPLY';
      if (options?.creditNoteMode || payment.isRefunded) {
        ribbonTitle = isGstEnabled ? 'TAX CREDIT NOTE / REFUND MEMO' : 'SERVICE CANCELLATION & REFUND VOUCHER';
      } else if (isCancelledDoc) {
        ribbonTitle = 'CANCELLED INVOICE';
      }

      doc.roundedRect(34, 98, 527, 24, 3).fillColor(isCancelledDoc ? '#991B1B' : '#0F2444').fill();
      doc.font(boldFont).fontSize(10.5).fillColor('#FFFFFF').text(ribbonTitle, 34, 105, { width: 527, align: 'center' });
      doc.font(boldFont).fontSize(7.5).fillColor(isCancelledDoc ? '#FCA5A5' : '#93C5FD').text(isCancelledDoc ? 'CANCELLATION / CREDIT NOTE COPY' : 'ORIGINAL FOR RECIPIENT', 34, 106, { width: 517, align: 'right' });
      const ribbonRule = isGstEnabled ? '(Under Rule 46/54 of CGST Rules, 2017)' : '(Non-GST Supply / Bill of Supply)';
      doc.font(regularFont).fontSize(7.5).fillColor('#94A3B8').text(ribbonRule, 44, 106, { width: 220, align: 'left' });

      // ==========================================
      // 4. TWO-COLUMN METADATA CARDS (Y: 128 to 235)
      // ==========================================
      const cardY = 128;
      const cardW = 260;

      // Calculate dynamic address height so lines never overlap
      doc.font(regularFont).fontSize(7);
      const measuredAddrH = doc.heightOfString(clientAddressDisplay, { width: 153, lineGap: 1 });
      const addrH = Math.min(26, measuredAddrH);

      const contentH = 18 + 14 + 14 + addrH + 4 + 14 + 14 + 8;
      const metaCardH = Math.max(102, contentH);

      // Left Card: Invoice / Credit Note Details
      const isCreditNoteCard = Boolean(options?.creditNoteMode || payment.isRefunded || cancData?.creditNoteNumber);
      const leftCardTitle = isCreditNoteCard ? 'TAX CREDIT NOTE / MEMO INFO' : 'INVOICE INFORMATION';
      doc.rect(34, cardY, cardW, 18).fillColor(isCreditNoteCard ? '#FEF2F2' : '#F1F5F9').fill();
      doc.font(boldFont).fontSize(8).fillColor(isCreditNoteCard ? '#991B1B' : '#0F2444').text(leftCardTitle, 42, cardY + 5);
      doc.roundedRect(34, cardY, cardW, metaCardH, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(34, cardY + 18).lineTo(34 + cardW, cardY + 18).strokeColor('#CBD5E1').stroke();

      const cnNumberDisplay = cancData?.creditNoteNumber || payment.creditNoteNumber || (isCreditNoteCard ? `CN-${new Date().getFullYear()}-${String(payment.transactionRef || payment._id).slice(-6).toUpperCase()}` : null);
      const cnDateDisplay = cancData?.effectiveDate ? new Date(cancData.effectiveDate).toLocaleDateString('en-GB') : invoiceDate;

      const invLabels = isCreditNoteCard && cnNumberDisplay
        ? [
            ['Credit Note No:', cnNumberDisplay, true],
            ['Original Inv Ref:', invoiceNo, false],
            ['Cancellation Date:', cnDateDisplay, false],
            ['Place of Supply:', `${displayClientState} (State Code: ${clientStateCode || 'N/A'})`, false],
            ['SAC Code:', '997156 (Financial Research & Info)', false]
          ]
        : [
            ['Invoice No:', invoiceNo, true],
            ['Invoice Date:', invoiceDate, false],
            ['Place of Supply:', `${displayClientState} (State Code: ${clientStateCode || 'N/A'})`, false],
            ['SAC Code:', '997156 (Financial Research & Information Services)', false],
            ['Reverse Charge (Y/N):', 'No (N)', false]
          ];
      let invY = cardY + 24;
      for (const [lbl, val, isBold] of invLabels) {
        doc.font(boldFont).fontSize(7.5).fillColor('#475569').text(lbl as string, 42, invY, { width: 100 });
        doc.font(isBold ? boldFont : regularFont).fontSize(7.5).fillColor('#0F172A').text(val as string, 142, invY, { width: 148 });
        invY += 14;
      }

      // Right Card: Client Details
      doc.rect(301, cardY, cardW, 18).fillColor('#F1F5F9').fill();
      doc.font(boldFont).fontSize(8).fillColor('#0F2444').text('BILL TO (CLIENT DETAILS)', 309, cardY + 5);
      doc.roundedRect(301, cardY, cardW, metaCardH, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.moveTo(301, cardY + 18).lineTo(301 + cardW, cardY + 18).strokeColor('#CBD5E1').stroke();

      let clY = cardY + 24;

      // 1. Client Name
      doc.font(boldFont).fontSize(7.5).fillColor('#475569').text('Client Name:', 309, clY, { width: 92 });
      doc.font(boldFont).fontSize(7.5).fillColor('#0F172A').text(clientFullName, 404, clY, { width: 153 });
      clY += 14;

      // 2. Mobile No
      doc.font(boldFont).fontSize(7.5).fillColor('#475569').text('Mobile No:', 309, clY, { width: 92 });
      doc.font(regularFont).fontSize(7.5).fillColor('#0F172A').text(clientMobile, 404, clY, { width: 153 });
      clY += 14;

      // 3. Address (Calculated dynamic offset prevents overlap with State & PAN!)
      doc.font(boldFont).fontSize(7.5).fillColor('#475569').text('Address:', 309, clY, { width: 92 });
      doc.font(regularFont).fontSize(7).fillColor('#0F172A').text(clientAddressDisplay, 404, clY, { width: 153, height: addrH, ellipsis: true, lineGap: 1 });
      clY += addrH + 4;

      // 4. State / State Code
      doc.font(boldFont).fontSize(7.5).fillColor('#475569').text('State / State Code:', 309, clY, { width: 92 });
      doc.font(regularFont).fontSize(7.5).fillColor('#0F172A').text(`${displayClientState} (Code: ${clientStateCode || 'N/A'})`, 404, clY, { width: 153 });
      clY += 14;

      // 5. Client PAN / Tax ID
      doc.font(boldFont).fontSize(7.5).fillColor('#475569').text('Client PAN / Tax ID:', 309, clY, { width: 92 });
      doc.font(regularFont).fontSize(7.5).fillColor('#0F172A').text(clientPan, 404, clY, { width: 153 });

      // ==========================================
      // 5. SERVICES TABLE (Y: 242 to 318)
      // ==========================================
      const tableY = cardY + metaCardH + 8;
      // Header row
      doc.rect(34, tableY, 527, 22).fillColor('#F1F5F9').fill();
      doc.roundedRect(34, tableY, 527, 22, 2).strokeColor('#94A3B8').lineWidth(0.5).stroke();

      doc.font(boldFont).fontSize(7.5).fillColor('#0F172A');
      doc.text('Sr.', 36, tableY + 7, { width: 26, align: 'center' });
      doc.text('Description of Services', 66, tableY + 7, { width: 155, align: 'left' });
      doc.text('SAC Code', 225, tableY + 7, { width: 50, align: 'center' });
      doc.text('Validity Period', 280, tableY + 7, { width: 95, align: 'center' });
      doc.text('Gross Amount', 370, tableY + 7, { width: 65, align: 'right' });
      doc.text('Discount (-)', 440, tableY + 7, { width: 55, align: 'right' });
      doc.text('Taxable Value', 500, tableY + 7, { width: 55, align: 'right' });

      // Table Body Row — compute dynamic height to prevent overlap
      // Description column: x=68, max width=151 (up to divider at x=223, with 4px padding)
      const bodyY = tableY + 22;
      const descColW = 151;
      const descX = 68;

      // Truncate segments to max 55 chars to avoid overflow
      const segmentsDisplay = segments.length > 55 ? segments.substring(0, 52) + '...' : segments;

      // Measure heights of each text element in description column
      const catNameH = doc.font(boldFont).fontSize(8).heightOfString(categoryName.toUpperCase(), { width: descColW });
      const segH = doc.font(boldFont).fontSize(7).heightOfString(`Segments: ${segmentsDisplay}`, { width: descColW });
      const subLabelH = 10; // "Research Analyst..." or Coupon label
      const descPadding = 8; // top+bottom padding

      const descTotalH = catNameH + segH + subLabelH + descPadding + 14;
      const bodyH = Math.max(descTotalH, 52); // minimum 52px

      doc.rect(34, bodyY, 527, bodyH).fillColor('#FFFFFF').fill();
      doc.roundedRect(34, bodyY, 527, bodyH, 2).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      // Vertical grid dividers (drawn AFTER rect so they appear on top)
      const divXs = [64, 223, 278, 378, 438, 498];
      for (const x of divXs) {
        doc.moveTo(x, tableY).lineTo(x, bodyY + bodyH).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      }

      // Sr. No — vertically centred
      doc.font(regularFont).fontSize(8).fillColor('#0F172A').text('1', 36, bodyY + Math.round(bodyH / 2) - 5, { width: 26, align: 'center' });

      // Description: Category Name & Segments — stacked, all within descColW
      let descCurY = bodyY + 7;
      doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(categoryName.toUpperCase(), descX, descCurY, { width: descColW, lineGap: 1 });
      descCurY += catNameH + 2;
      doc.font(boldFont).fontSize(7).fillColor('#2563EB').text(`Segments: ${segmentsDisplay}`, descX, descCurY, { width: descColW, lineGap: 1 });
      descCurY += segH + 2;
      if (couponCodeText) {
        doc.roundedRect(descX, descCurY, Math.min(125, descColW - 4), 12, 2).fillColor('#ECFDF5').strokeColor('#A7F3D0').lineWidth(0.5).fillAndStroke('#ECFDF5', '#A7F3D0');
        doc.font(boldFont).fontSize(6.5).fillColor('#047857').text(`Coupon: ${couponCodeText}`, descX + 4, descCurY + 2, { width: descColW - 8 });
      } else {
        doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text('Research Analyst Service Subscription', descX, descCurY, { width: descColW });
      }

      // SAC Code — vertically centred
      doc.font(regularFont).fontSize(8).fillColor('#0F172A').text('997156', 225, bodyY + Math.round(bodyH / 2) - 5, { width: 50, align: 'center' });

      // Validity Period — split date range into two lines to avoid overflow
      const vpMidY = bodyY + Math.round(bodyH / 2) - 10;
      doc.font(boldFont).fontSize(7).fillColor('#0F172A').text(`${startDateFormatted}`, 280, vpMidY, { width: 95, align: 'center' });
      doc.font(boldFont).fontSize(7).fillColor('#0F172A').text(`${endDateFormatted}`, 280, vpMidY + 10, { width: 95, align: 'center' });
      doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text(`${validityDays} Days Access`, 280, vpMidY + 21, { width: 95, align: 'center' });

      // Amounts — vertically centred
      const amtY = bodyY + Math.round(bodyH / 2) - 5;
      doc.font(regularFont).fontSize(8).fillColor('#0F172A').text(formatInr(grossBase), 380, amtY, { width: 55, align: 'right' });
      doc.font(boldFont).fontSize(8).fillColor('#047857').text(baseDiscount > 0 ? ('- ' + formatInr(baseDiscount)) : '-', 440, amtY, { width: 55, align: 'right' });
      doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(formatInr(taxableValue), 500, amtY, { width: 55, align: 'right' });

      // ==========================================
      // 6. SUMMARY SECTION
      // (PAYMENT & SETTLEMENT DETAILS HAS BEEN REMOVED)
      // ==========================================
      const sumY = bodyY + bodyH + 10;

      // Right Box: Tax Breakdown Rows
      const rightX = 352;
      const rightW = 209;

      const taxRows: [string, string, string, boolean][] = [];
      if (!isGstEnabled) {
        if (baseDiscount > 0) {
          taxRows.push(['Gross Plan Value', formatInr(grossBase), '#0F172A', false]);
          taxRows.push([`Less: Discount (${couponCodeText || 'Coupon'})`, '- ' + formatInr(baseDiscount), '#047857', true]);
          taxRows.push(['Net Payable Amount', formatInr(taxableValue), '#0F172A', true]);
        } else {
          taxRows.push(['Plan Amount', formatInr(taxableValue), '#0F172A', true]);
        }
        taxRows.push(['GST (Non-GST / Exempt)', '₹ 0.00', '#64748B', false]);
      } else {
        if (baseDiscount > 0) {
          taxRows.push(['Gross Plan Value', formatInr(grossBase), '#0F172A', false]);
          taxRows.push([`Less: Discount (${couponCodeText || 'Coupon'})`, '- ' + formatInr(baseDiscount), '#047857', true]);
          taxRows.push(['Net Taxable Value', formatInr(taxableValue), '#0F172A', true]);
        } else {
          taxRows.push(['Taxable Value', formatInr(taxableValue), '#0F172A', true]);
        }

        if (isIntraState) {
          taxRows.push(['Add: CGST (9%)', formatInr(cgst), '#0F172A', false]);
          taxRows.push(['Add: SGST (9%)', formatInr(sgst), '#0F172A', false]);
        } else {
          taxRows.push(['Add: IGST (18%)', formatInr(igst), '#0F172A', false]);
          taxRows.push(['Add: CGST / SGST', '₹ 0.00', '#64748B', false]);
        }
        taxRows.push(['Total Tax Amount (GST)', formatInr(totalGst), '#0F172A', true]);
      }

      const rowH = baseDiscount > 0 ? 19 : 22;
      const totalBarHeight = 28;
      const totalTableHeight = (taxRows.length * rowH) + totalBarHeight;

      doc.roundedRect(rightX, sumY, rightW, totalTableHeight, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      let rY = sumY;
      for (const [lbl, val, col, isB] of taxRows) {
        doc.font(isB ? boldFont : regularFont).fontSize(7.5).fillColor('#475569').text(lbl, rightX + 8, rY + 5, { width: 115 });
        doc.font(isB ? boldFont : regularFont).fontSize(7.5).fillColor(col).text(val, rightX + 115, rY + 5, { width: 86, align: 'right' });
        rY += rowH;
        doc.moveTo(rightX, rY).lineTo(rightX + rightW, rY).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      }

      // Final Total Row Highlighted
      doc.rect(rightX, rY, rightW, totalBarHeight).fillColor('#0F2444').fill();
      doc.font(boldFont).fontSize(8.5).fillColor('#FFFFFF').text('Total Amount (INR)', rightX + 8, rY + 8, { width: 110 });
      doc.font(boldFont).fontSize(10).fillColor('#FFFFFF').text(formatInr(netInvoiceTotal), rightX + 110, rY + 7, { width: 91, align: 'right' });

      // Left Box: Amount in words Card (Matching height, clean & balanced!)
      doc.roundedRect(34, sumY, 310, totalTableHeight, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.rect(34, sumY, 310, 18).fillColor('#F8FAFC').fill();
      doc.font(boldFont).fontSize(7.5).fillColor('#0F2444').text('TOTAL INVOICE AMOUNT (IN WORDS)', 42, sumY + 5);
      doc.moveTo(34, sumY + 18).lineTo(344, sumY + 18).strokeColor('#CBD5E1').stroke();

      doc.font(boldFont).fontSize(9.5).fillColor('#0F172A').text(numberToWords(Math.round(netInvoiceTotal)), 44, sumY + 30, { width: 290, lineGap: 2 });

      if (couponCodeText) {
        doc.font(boldFont).fontSize(7.2).fillColor('#047857').text(`✓ Coupon Applied: ${couponCodeText} (Discount: ${formatInr(baseDiscount)})`, 44, sumY + 56);
      }

      // ==========================================
      // 6.5. CANCELLATION & STATUTORY REFUND BREAKDOWN MEMORANDUM
      // (Renders when document is cancelled or has refund / credit note details)
      // ==========================================
      let nextSectionY = sumY + totalTableHeight + 10;
      const fullWidth = 527;

      if (cancData || isCancelledDoc) {
        const cancBoxY = nextSectionY;
        const cancBoxH = 88;

        // Outer container with subtle rose border & crisp header
        doc.roundedRect(34, cancBoxY, fullWidth, cancBoxH, 3).strokeColor('#FCA5A5').lineWidth(0.75).stroke();
        doc.rect(34, cancBoxY, fullWidth, 18).fillColor('#FEF2F2').fill();
        doc.moveTo(34, cancBoxY + 18).lineTo(34 + fullWidth, cancBoxY + 18).strokeColor('#FCA5A5').lineWidth(0.5).stroke();

        doc.font(boldFont).fontSize(8).fillColor('#991B1B').text('SUBSCRIPTION CANCELLATION & STATUTORY REFUND BREAKDOWN', 42, cancBoxY + 5);
        if (cnNumberDisplay) {
          doc.font(boldFont).fontSize(7.5).fillColor('#DC2626').text(`Credit Note Ref: ${cnNumberDisplay}`, 34, cancBoxY + 5, { width: 519, align: 'right' });
        }

        // Compute breakdown values
        const effDateStr = cancData?.effectiveDate ? new Date(cancData.effectiveDate).toLocaleDateString('en-GB') : invoiceDate;
        const totDaysVal = cancData?.totalDays || validityDays || 30;
        const usedDaysVal = cancData?.daysUsed !== undefined ? cancData.daysUsed : 0;
        const remDaysVal = cancData?.remainingDays !== undefined ? cancData.remainingDays : Math.max(0, totDaysVal - usedDaysVal);
        const refundAmtVal = cancData?.refundAmount !== undefined ? cancData.refundAmount : (payment.refundedAmount || netInvoiceTotal);
        const baseRefundVal = cancData?.refundBaseAmount !== undefined ? cancData.refundBaseAmount : (payment.refundedBaseAmount || (isGstEnabled ? Number((refundAmtVal / 1.18).toFixed(2)) : refundAmtVal));
        const gstRefundVal = cancData?.refundGstAmount !== undefined ? cancData.refundGstAmount : (payment.refundedGstAmount || Number((refundAmtVal - baseRefundVal).toFixed(2)));

        const refundNatureStr = (cancData?.cancellationType === 'CANCEL_AND_REFUND' || refundAmtVal > 0)
          ? 'Pro-Rata Research Fee Refund'
          : 'Service Subscription Termination';

        const refundModeStr = cancData?.refundMode === 'WITHOUT_GST'
          ? 'Base Fee Only (GST Retained)'
          : 'Original Payment Source (PG/Bank)';

        // Clean Two-Column Layout (Left: 42 to 290 | Right: 305 to 555)
        // Vertical divider at X = 298
        doc.moveTo(298, cancBoxY + 20).lineTo(298, cancBoxY + 68).strokeColor('#FEE2E2').lineWidth(0.5).stroke();

        // --- ROW 1 (Y: cancBoxY + 23) ---
        const r1Y = cancBoxY + 23;
        // Left: Cancellation Date
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Cancellation Effective Date:', 42, r1Y, { width: 105 });
        doc.font(boldFont).fontSize(7.5).fillColor('#0F172A').text(effDateStr, 150, r1Y, { width: 140 });
        // Right: Net Refund Payout
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Approved Net Refund Amount:', 305, r1Y, { width: 110 });
        doc.font(boldFont).fontSize(8.5).fillColor('#047857').text(formatInr(refundAmtVal), 420, r1Y - 1, { width: 135 });

        // --- ROW 2 (Y: cancBoxY + 38) ---
        const r2Y = cancBoxY + 38;
        // Left: Service Days Cancelled
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Service Days Cancelled:', 42, r2Y, { width: 105 });
        doc.font(boldFont).fontSize(7).fillColor('#DC2626').text(
          `${remDaysVal} Days`,
          150, r2Y, { width: 42, continued: true }
        );
        doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text(` (${usedDaysVal}d used / ${totDaysVal}d total)`);
        // Right: Tax Reversal
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Tax Reversal Breakdown:', 305, r2Y, { width: 110 });
        if (isGstEnabled) {
          doc.font(regularFont).fontSize(7).fillColor('#0F172A').text(`Base: ${formatInr(baseRefundVal)}  |  GST: ${formatInr(gstRefundVal)}`, 420, r2Y, { width: 135 });
        } else {
          doc.font(regularFont).fontSize(7).fillColor('#0F172A').text(`Fee Reversal: ${formatInr(refundAmtVal)} (Non-GST)`, 420, r2Y, { width: 135 });
        }

        // --- ROW 3 (Y: cancBoxY + 53) ---
        const r3Y = cancBoxY + 53;
        // Left: Settlement Nature
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Settlement Nature:', 42, r3Y, { width: 105 });
        doc.font(regularFont).fontSize(7).fillColor('#0F172A').text(refundNatureStr, 150, r3Y, { width: 140 });
        // Right: Disbursement Mode
        doc.font(boldFont).fontSize(7).fillColor('#64748B').text('Disbursement Mode:', 305, r3Y, { width: 110 });
        doc.font(regularFont).fontSize(7).fillColor('#0F172A').text(refundModeStr, 420, r3Y, { width: 135 });

        // --- ROW 4 / BOTTOM DIVIDER (Y: cancBoxY + 68) ---
        doc.moveTo(34, cancBoxY + 68).lineTo(34 + fullWidth, cancBoxY + 68).strokeColor('#FEE2E2').lineWidth(0.5).stroke();
        const r4Y = cancBoxY + 72;
        const rawRemarks = cancData?.remarks || payment.refundRemarks || 'Approved subscription cancellation & pro-rata research fee refund under SEBI RA regulations.';
        const sanitizedRemarks = rawRemarks.replace(/advisory/gi, 'research').replace(/advisor/gi, 'research analyst');

        doc.font(boldFont).fontSize(6.5).fillColor('#991B1B').text('Cancellation Reason / Audit Remarks:', 42, r4Y, { width: 135 });
        doc.font(regularFont).fontSize(6.5).fillColor('#475569').text(sanitizedRemarks, 180, r4Y, { width: 375, ellipsis: true });

        nextSectionY = cancBoxY + cancBoxH + 8;
      }

      // ==========================================
      // 7. STATUTORY DISCLAIMERS (FULL WIDTH)
      // (AUTHORIZED SIGNATORY HAS BEEN REMOVED)
      // ==========================================
      const discY = nextSectionY;
      const discH = 740 - discY;

      doc.roundedRect(34, discY, fullWidth, discH, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.rect(34, discY, fullWidth, 18).fillColor('#F8FAFC').fill();
      doc.font(boldFont).fontSize(7.5).fillColor('#0F2444').text('REGULATORY DISCLAIMERS & INVESTOR CHARTER', 42, discY + 5);
      doc.moveTo(34, discY + 18).lineTo(34 + fullWidth, discY + 18).strokeColor('#CBD5E1').stroke();

      const discPoints = [
        '• 1. Securities Market Risk: Investments in securities market are subject to market risks. Read all the related documents carefully before investing.',
        '• 2. No Return Assurance: Registration granted by SEBI, membership of BASL and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.',
        '• 3. Compliance Mandate: Research services are rendered in strict compliance with the SEBI (Research Analysts) Regulations, 2014 and code of conduct stipulated thereunder.',
        isCancelledDoc
          ? '• 4. Statutory Credit Note & Refund: This document constitutes an official Credit Note / Refund Voucher under Rule 54 of the CGST Rules, 2017 & SEBI RA regulations. The approved refund has been initiated to the client source account.'
          : '• 4. Fee & Refund Terms: Service subscription fees once remitted are non-refundable as agreed in the service terms and investor agreement.',
        '• 5. Stop Loss Discipline: Investors are encouraged to adhere strictly to stop-loss guidelines and practice responsible risk management.',
        `• 6. Grievance Redressal: For any service queries or unresolved grievances, please reach out to our Compliance Officer at ${tenant.email || 'support@research.com'} or phone ${tenant.mobile || 'N/A'}.`,
        '• 7. SEBI Redressal Portals: Investors may also lodge grievances directly on SEBI SCORES portal (https://scores.sebi.gov.in) or access the SMART ODR platform (https://smartodr.in) for online conciliation.'
      ];
      let dy = discY + 22;
      for (const p of discPoints) {
        doc.font(regularFont).fontSize(6.5).fillColor('#475569').text(p, 42, dy, { width: 511, lineGap: 1.5 });
        const pH = doc.heightOfString(p, { width: 511, lineGap: 1.5 });
        dy += pH + 3;
      }

      // ==========================================
      // 8. BOTTOM FOOTER (Y: 746)
      // ==========================================
      const footY = 746;
      doc.moveTo(34, footY).lineTo(561, footY).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      const footerNotice = isCancelledDoc
        ? 'This is a system-generated electronic Credit Note / Refund Voucher issued under Rule 54 of the CGST Rules, 2017 & SEBI RA Regulations.'
        : 'This is a system-generated electronic tax invoice issued under Rule 46 of the CGST Rules, 2017 & SEBI (Research Analysts) Regulations, 2014.';
      doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text(footerNotice, 34, footY + 8, { width: 420, align: 'left' });
      doc.font(boldFont).fontSize(6.5).fillColor('#64748B').text('Page 1 of 1', 460, footY + 8, { width: 101, align: 'right' });

      // ==========================================
      // WATERMARK (If cancelled or refund document)
      // ==========================================
      if (isCancelledDoc) {
        const watermark = (options?.watermarkText || (options?.creditNoteMode || payment.isRefunded ? 'CREDIT NOTE / REFUND' : 'CANCELLED')).toUpperCase();
        doc.save();
        doc.rotate(-30, { origin: [297, 420] });
        doc.font(boldFont).fontSize(48).fillColor('#EF4444').fillOpacity(0.12);
        doc.text(watermark, 70, 395, { width: 455, align: 'center' });
        doc.restore();
      }

      doc.end();
    } catch (error) {
      console.error('PDF Generation Error:', error);
      reject(error);
    }
  });
};

/**
 * Generate official Platform SaaS Tax Invoice PDF for RA Companies
 */
export const generatePlatformInvoicePdf = async (invoiceId: string): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const invoice: any = await PlatformInvoice.findById(invoiceId).populate('subscriptionId').populate('planId').lean();
      if (!invoice) return reject(new Error('Platform invoice not found'));

      const billingConfig: any = (await PlatformBillingConfig.findOne().lean()) || {
        companyName: 'Platform Infrastructure Technologies',
        address: 'Corporate Headquarters, Financial District',
        gstNumber: '07AAAAA0000A1Z5',
        panNumber: 'AAAAA0000A',
        state: 'DELHI',
        invoicePrefix: 'PLAT-INV-'
      };

      // Resolve logo from PlatformBillingConfig or Global Branding
      let logoUrl = billingConfig?.logoUrl;
      if (!logoUrl) {
        try {
          const sysSetting: any = await SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() ||
            (dynamicDb?.SystemSetting ? await dynamicDb.SystemSetting.findOne({ key: 'GLOBAL_BRANDING' }).lean() : null);
          if (sysSetting && sysSetting.value) {
            const parsed = typeof sysSetting.value === 'string' ? JSON.parse(sysSetting.value) : sysSetting.value;
            if (parsed.logoUrl) logoUrl = parsed.logoUrl;
          }
        } catch { }
      }
      const logoPath = resolveLogoPath(logoUrl);

      const doc = new PDFDocument({ margin: 34, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Resolve TrueType fonts for full Unicode support (e.g. ₹ Indian Rupee sign)
      const resolveFont = (filenames: string[]): string | null => {
        for (const filename of filenames) {
          const candidatePaths = [
            path.resolve(__dirname, '../../assets/fonts', filename),
            path.resolve(__dirname, '../../../assets/fonts', filename),
            path.resolve(process.cwd(), 'assets/fonts', filename),
            path.resolve(process.cwd(), 'backend/assets/fonts', filename),
            `C:\\Windows\\Fonts\\${filename}`,
            `C:\\Windows\\Fonts\\${filename.toLowerCase()}`,
            `C:\\Windows\\Fonts\\${filename.toUpperCase()}`
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) return p;
          }
        }
        return null;
      };

      const regularFontPath = resolveFont(['arial.ttf', 'Arial.ttf']);
      const boldFontPath = resolveFont(['arialbd.ttf', 'ARIALBD.TTF', 'Arial-Bold.ttf', 'ArialBold.ttf']);

      let regularFont = 'Helvetica';
      let boldFont = 'Helvetica-Bold';
      let hasUnicodeRupee = false;

      if (regularFontPath) {
        try {
          doc.registerFont('App-Regular', regularFontPath);
          regularFont = 'App-Regular';
          hasUnicodeRupee = true;
        } catch { }
      }
      if (boldFontPath) {
        try {
          doc.registerFont('App-Bold', boldFontPath);
          boldFont = 'App-Bold';
        } catch { }
      }

      const cur = hasUnicodeRupee ? '₹ ' : 'Rs. ';

      // Top Primary Accent Bar
      doc.rect(34, 30, 527, 4).fillColor('#0284C7').fill();

      // Issuer Header: Draw Logo and Company Details
      let textStartX = 34;
      let textWidth = 300;
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 34, 38, { fit: [110, 48] });
          textStartX = 155;
          textWidth = 190;
        } catch (e) {
          console.warn('Could not draw logo image on platform invoice:', e);
        }
      }

      // Issuer Title & Details
      doc.font(boldFont).fontSize(12).fillColor('#0F172A').text(billingConfig.companyName || 'Platform Infrastructure Technologies', textStartX, 40, { width: textWidth });
      doc.font(regularFont).fontSize(7.5).fillColor('#64748B').text(billingConfig.address || 'Corporate Headquarters, Financial District', textStartX, 55, { width: textWidth });
      doc.font(regularFont).fontSize(7.5).fillColor('#475569').text(`GSTIN: ${billingConfig.gstin || billingConfig.gstNumber || 'N/A'}  |  PAN: ${billingConfig.pan || billingConfig.panNumber || 'N/A'}\nState: ${billingConfig.state || 'DELHI'}`, textStartX, 68, { width: textWidth });

      // Invoice Badge on Top Right
      doc.font(boldFont).fontSize(14).fillColor('#0284C7').text('TAX INVOICE', 350, 40, { width: 211, align: 'right' });
      doc.font(boldFont).fontSize(8.5).fillColor('#0F172A').text(`Invoice #: ${invoice.invoiceNumber}`, 350, 56, { width: 211, align: 'right' });
      doc.font(regularFont).fontSize(8).fillColor('#64748B').text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 350, 69, { width: 211, align: 'right' });
      doc.font(boldFont).fontSize(8).fillColor('#059669').text(`Status: ${invoice.status || 'PAID'}`, 350, 81, { width: 211, align: 'right' });

      doc.moveTo(34, 106).lineTo(561, 106).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      // Billed To Section
      doc.rect(34, 115, 527, 65).fillColor('#F8FAFC').fill();
      doc.roundedRect(34, 115, 527, 65, 3).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      doc.font(boldFont).fontSize(8).fillColor('#0284C7').text('BILLED TO (SUBSCRIBING RESEARCH ANALYST FIRM)', 44, 124);
      doc.font(boldFont).fontSize(10).fillColor('#0F172A').text(invoice.tenantCompanyName || 'Advisory Firm', 44, 138);
      doc.font(regularFont).fontSize(8).fillColor('#475569').text(`Email: ${invoice.tenantEmail || 'N/A'}`, 44, 154);

      doc.font(regularFont).fontSize(8).fillColor('#475569').text(`State (Place of Supply): ${invoice.tenantState || 'N/A'}`, 320, 138);
      doc.font(regularFont).fontSize(8).fillColor('#475569').text(`GSTIN: ${invoice.tenantGstin || 'Unregistered / Exempt'}`, 320, 154);

      // Line Items Table Header
      const tableTop = 195;
      doc.rect(34, tableTop, 527, 22).fillColor('#0F172A').fill();
      doc.font(boldFont).fontSize(8).fillColor('#FFFFFF');
      doc.text('#', 42, tableTop + 6, { width: 20 });
      doc.text('DESCRIPTION OF SERVICE', 70, tableTop + 6, { width: 220 });
      doc.text('SAC CODE', 300, tableTop + 6, { width: 60, align: 'center' });
      doc.text('RATE / PLAN', 370, tableTop + 6, { width: 80, align: 'right' });
      doc.text('TAXABLE AMOUNT', 460, tableTop + 6, { width: 90, align: 'right' });

      // Line Item Row
      const rowTop = tableTop + 22;
      doc.rect(34, rowTop, 527, 50).fillColor('#FFFFFF').fill();
      doc.roundedRect(34, rowTop, 527, 50, 0).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      doc.font(regularFont).fontSize(8).fillColor('#0F172A');
      doc.text('1', 42, rowTop + 8, { width: 20 });
      doc.font(boldFont).text(`SaaS Platform Subscription - ${invoice.planName || 'Standard'}`, 70, rowTop + 8, { width: 220 });
      doc.font(regularFont).fontSize(7.5).fillColor('#64748B').text('Enterprise Research Governance, SEBI Compliance Engine & Advisory Signal Delivery Platform', 70, rowTop + 22, { width: 220 });

      doc.font(regularFont).fontSize(8).fillColor('#0F172A').text('997331', 300, rowTop + 8, { width: 60, align: 'center' });
      doc.text(`${cur}${Number(invoice.baseAmount || 0).toFixed(2)}`, 370, rowTop + 8, { width: 80, align: 'right' });
      doc.font(boldFont).text(`${cur}${Number(invoice.baseAmount || 0).toFixed(2)}`, 460, rowTop + 8, { width: 90, align: 'right' });

      // Summary Breakdown Box
      const sumTop = rowTop + 60;
      const sumLeft = 320;
      const sumWidth = 241;

      doc.roundedRect(sumLeft, sumTop, sumWidth, 105, 3).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      let currY = sumTop + 8;
      // Taxable Value
      doc.font(regularFont).fontSize(8).fillColor('#475569').text('Taxable Base Amount:', sumLeft + 10, currY);
      doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(`${cur}${Number(invoice.baseAmount || 0).toFixed(2)}`, sumLeft + 120, currY, { width: 110, align: 'right' });

      currY += 16;
      if (invoice.isInterState) {
        doc.font(regularFont).fontSize(8).fillColor('#475569').text('Integrated GST (IGST 18%):', sumLeft + 10, currY);
        doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(`${cur}${Number(invoice.igstAmount || invoice.gstAmount || 0).toFixed(2)}`, sumLeft + 120, currY, { width: 110, align: 'right' });
      } else {
        doc.font(regularFont).fontSize(8).fillColor('#475569').text('Central GST (CGST 9%):', sumLeft + 10, currY);
        doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(`${cur}${Number(invoice.cgstAmount || 0).toFixed(2)}`, sumLeft + 120, currY, { width: 110, align: 'right' });
        currY += 16;
        doc.font(regularFont).fontSize(8).fillColor('#475569').text('State GST (SGST 9%):', sumLeft + 10, currY);
        doc.font(boldFont).fontSize(8).fillColor('#0F172A').text(`${cur}${Number(invoice.sgstAmount || 0).toFixed(2)}`, sumLeft + 120, currY, { width: 110, align: 'right' });
      }

      currY += 18;
      doc.moveTo(sumLeft + 10, currY).lineTo(sumLeft + sumWidth - 10, currY).strokeColor('#CBD5E1').stroke();
      currY += 6;

      // Total
      doc.font(boldFont).fontSize(9.5).fillColor('#0284C7').text('Total Amount Paid:', sumLeft + 10, currY);
      doc.font(boldFont).fontSize(9.5).fillColor('#0284C7').text(`${cur}${Number(invoice.totalAmount || 0).toFixed(2)}`, sumLeft + 120, currY, { width: 110, align: 'right' });

      // Amount in Words & Terms
      const termsTop = sumTop;
      doc.font(boldFont).fontSize(8).fillColor('#0F172A').text('Terms & Conditions:', 34, termsTop);
      doc.font(regularFont).fontSize(7).fillColor('#64748B').text('1. SAC Code 997331: Licensing services for the right to use computer software.\n2. This is an electronic invoice generated under Section 31 of CGST Act, 2017.\n3. Subscription renewals are governed by the platform Master Services Agreement.\n4. Input Tax Credit (ITC) eligibility is subject to the GSTIN provided at invoicing.', 34, termsTop + 14, { width: 270, lineGap: 3 });

      // Signatory
      const signTop = 410;
      doc.roundedRect(340, signTop, 221, 55, 3).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      doc.font(boldFont).fontSize(7.5).fillColor('#0F172A').text(`For ${billingConfig.companyName || 'Platform Technologies'}`, 350, signTop + 8);
      doc.font(regularFont).fontSize(6.8).fillColor('#64748B').text('Authorized Signatory\n(Digitally generated invoice - no physical signature required)', 350, signTop + 24, { width: 200 });

      // Bottom Footer
      const footY = 746;
      doc.moveTo(34, footY).lineTo(561, footY).strokeColor('#CBD5E1').lineWidth(0.5).stroke();
      doc.font(regularFont).fontSize(6.5).fillColor('#64748B').text('This is a system-generated electronic tax invoice issued for Platform SaaS Licensing services.', 34, footY + 8, { width: 420, align: 'left' });
      doc.font(boldFont).fontSize(6.5).fillColor('#64748B').text('Page 1 of 1', 460, footY + 8, { width: 101, align: 'right' });

      doc.end();
    } catch (err) {
      console.error('Platform Invoice PDF Generation Error:', err);
      reject(err);
    }
  });
};
