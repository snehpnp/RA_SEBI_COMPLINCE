import ExcelJS from 'exceljs';

export interface VaultExportData {
  client: any;
  clientProfile?: any;
  subscriptions: any[];
  payments: any[];
  tradeSignals: any[];
  recordings: any[];
  activityLogs: any[];
  documents?: any[];
  researchReports?: any[];
  agreements?: any[];
}

// Professional SEBI compliance workbook styling
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' } // Dark Slate #1E293B
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' }
};

/**
 * Generates a Consolidated Multi-Tab Excel Workbook (.xlsx)
 * Containing all client tabular/ledger data across 5 distinct tabs:
 * Tab 1: Client_Profile
 * Tab 2: Subscriptions_&_Invoices
 * Tab 3: Trade_Signals
 * Tab 4: Call_Recordings
 * Tab 5: Audit_Trail
 */
export const generateMultiTabClientExcel = async (data: VaultExportData): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEBI Compliance System';
  wb.lastModifiedBy = 'Compliance Officer';
  wb.created = new Date();
  wb.modified = new Date();

  // --------------------------------------------------------------------------
  // TAB 1: Client_Profile
  // --------------------------------------------------------------------------
  const wsProfile = wb.addWorksheet('Client_Profile', { views: [{ showGridLines: true }] });
  wsProfile.columns = [
    { header: 'Profile Field / Metric', key: 'key', width: 28 },
    { header: 'Verified Client Detail', key: 'value', width: 45 }
  ];
  const rowH1 = wsProfile.getRow(1);
  rowH1.fill = HEADER_FILL;
  rowH1.font = HEADER_FONT;
  rowH1.height = 24;

  const profileRows = [
    { key: 'Client ID', value: String(data.client._id || data.client.id) },
    { key: 'Full Legal Name', value: data.client.name || 'N/A' },
    { key: 'Mobile Phone', value: String(data.client.mobile || 'N/A') },
    { key: 'Email Address', value: data.client.email || 'N/A' },
    { key: 'PAN Card Number', value: data.client.pan || 'N/A' },
    { key: 'Investor Category', value: data.client.category || 'INDIVIDUAL' },
    { key: 'Account Status', value: data.client.status || 'ACTIVE' },
    { key: 'KYC Verification Status', value: data.client.kycStatus || 'PENDING' },
    { key: 'Agreement Signed Status', value: data.client.agreementStatus || 'PENDING' },
    { key: 'Registration Timestamp (UTC)', value: data.client.createdAt ? new Date(data.client.createdAt).toISOString() : 'N/A' },
    { key: 'Registration Timestamp (IST)', value: data.client.createdAt ? new Date(data.client.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A' },
    { key: 'Address Line', value: data.client.addressLine1 || data.clientProfile?.addressLine1 || 'N/A' },
    { key: 'City', value: data.client.city || data.clientProfile?.city || 'N/A' },
    { key: 'State', value: data.client.state || data.clientProfile?.state || 'N/A' },
    { key: 'Pin Code', value: String(data.client.zipCode || data.clientProfile?.zipCode || 'N/A') },
    { key: 'Occupation', value: data.clientProfile?.occupation || data.client.occupation || 'N/A' },
    { key: 'Investment Horizon (Months)', value: String(data.clientProfile?.investmentPeriod || '12+') },
    { key: 'Assessed Risk Profile', value: data.clientProfile?.riskProfile || 'MODERATE' },
    { key: 'DigiLocker / KRA Verified', value: (data.client as any)?.kraVerified ? 'YES' : 'NO' }
  ];
  profileRows.forEach(r => wsProfile.addRow(r));

  // --------------------------------------------------------------------------
  // TAB 2: Subscriptions_&_Invoices
  // --------------------------------------------------------------------------
  const wsSubs = wb.addWorksheet('Subscriptions_&_Invoices', { views: [{ showGridLines: true }] });
  wsSubs.columns = [
    { header: 'Plan Name', key: 'planName', width: 26 },
    { header: 'Research Segments', key: 'segment', width: 22 },
    { header: 'Purchase Date & Time (IST)', key: 'purchaseTimestamp', width: 24 },
    { header: 'Validity Start Date', key: 'startDate', width: 18 },
    { header: 'Validity Expiry Date', key: 'endDate', width: 18 },
    { header: 'Amount Paid (INR)', key: 'price', width: 18 },
    { header: 'Payment Mode', key: 'paymentMode', width: 18 },
    { header: 'Transaction / Order Ref ID', key: 'paymentId', width: 30 },
    { header: 'Invoice Reference', key: 'invoiceNumber', width: 22 },
    { header: 'Subscription Status', key: 'status', width: 18 }
  ];
  const rowH2 = wsSubs.getRow(1);
  rowH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } }; // Dark Emerald
  rowH2.font = HEADER_FONT;
  rowH2.height = 24;

  const subRows = (data.subscriptions || []).map((s: any) => {
    const matchingPay = (data.payments || []).find((p: any) => String(p.planId) === String(s.planId || s.plan?._id));
    const purchaseTime = s.createdAt || matchingPay?.createdAt || s.startDate;
    return {
      planName: s.plan?.name || 'Advisory Plan',
      segment: s.plan?.researchSegments || s.segment || 'N/A',
      purchaseTimestamp: purchaseTime ? new Date(purchaseTime).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
      startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
      endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
      price: s.amount || s.amountTotal || s.plan?.price || 0,
      paymentMode: matchingPay?.paymentMode || s.paymentMode || 'Online',
      paymentId: matchingPay?.transactionRef || matchingPay?.gatewayPaymentId || s.paymentId || 'N/A',
      invoiceNumber: matchingPay?.invoiceNumber || (matchingPay?._id ? `INV-${String(matchingPay._id).slice(-6).toUpperCase()}` : 'N/A'),
      status: s.status
    };
  });
  subRows.forEach(r => wsSubs.addRow(r));

  // --------------------------------------------------------------------------
  // TAB 3: Trade_Signals
  // --------------------------------------------------------------------------
  const wsTrades = wb.addWorksheet('Trade_Signals', { views: [{ showGridLines: true }] });
  wsTrades.columns = [
    { header: 'Open Date & Time (IST)', key: 'date', width: 22 },
    { header: 'Close Date & Time (IST)', key: 'closedAt', width: 22 },
    { header: 'Stock Symbol', key: 'symbol', width: 16 },
    { header: 'Company Name', key: 'stockName', width: 26 },
    { header: 'Market Segment', key: 'segment', width: 18 },
    { header: 'Call Type', key: 'callType', width: 14 },
    { header: 'Entry Price (INR)', key: 'entryPrice', width: 16 },
    { header: 'Targets (INR)', key: 'targets', width: 24 },
    { header: 'Target 1', key: 'target1', width: 14 },
    { header: 'Target 2', key: 'target2', width: 14 },
    { header: 'Target 3', key: 'target3', width: 14 },
    { header: 'Stoploss', key: 'stoploss', width: 14 },
    { header: 'Exit Price', key: 'exitPrice', width: 14 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Outcome', key: 'closeStatus', width: 16 },
    { header: 'P&L Return (%)', key: 'pnlPercent', width: 16 },
    { header: 'Analyst Close Remark', key: 'closeRemark', width: 30 }
  ];
  const rowH3 = wsTrades.getRow(1);
  rowH3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } }; // Dark Violet
  rowH3.font = HEADER_FONT;
  rowH3.height = 24;

  const tradeRows = (data.tradeSignals || []).map((s: any) => {
    let pnl = '0.00%';
    if (s.exitPrice && s.entryPrice) {
      const factor = s.callType === 'BUY'
        ? (s.exitPrice - s.entryPrice) / s.entryPrice
        : (s.entryPrice - s.exitPrice) / s.entryPrice;
      pnl = `${(factor * 100).toFixed(2)}%`;
    }
    const tgts = [s.target1, s.target2, s.target3].filter((t: any) => t !== null && t !== undefined && !isNaN(Number(t)));
    const targetsStr = tgts.length > 0 ? tgts.map((t: any) => `₹${t}`).join(' / ') : `₹${s.target1 || '-'}`;

    return {
      date: s.createdAt ? new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
      closedAt: s.closedAt ? new Date(s.closedAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : (s.status === 'ACTIVE' || s.status === 'OPEN' ? 'Open / Active' : '-'),
      symbol: s.stockId?.symbol || s.stockSymbol || 'N/A',
      stockName: s.stockId?.name || s.stockName || 'Stock',
      segment: s.segment,
      callType: s.callType,
      entryPrice: s.entryPrice,
      targets: targetsStr,
      target1: s.target1,
      target2: s.target2 || '',
      target3: s.target3 || '',
      stoploss: s.stoploss,
      exitPrice: s.exitPrice || '',
      status: s.status,
      closeStatus: s.closeStatus || (s.status === 'ACTIVE' || s.status === 'OPEN' ? 'OPEN' : 'CLOSED'),
      pnlPercent: pnl,
      closeRemark: s.closeRemark || ''
    };
  });
  tradeRows.forEach(r => wsTrades.addRow(r));

  // --------------------------------------------------------------------------
  // TAB 4: Research_Reports
  // --------------------------------------------------------------------------
  const wsReports = wb.addWorksheet('Research_Reports', { views: [{ showGridLines: true }] });
  wsReports.columns = [
    { header: 'Report Title', key: 'title', width: 30 },
    { header: 'Market Segment', key: 'segment', width: 18 },
    { header: 'Report Type', key: 'type', width: 16 },
    { header: 'Analyst Recommendation', key: 'recommendation', width: 22 },
    { header: 'Target Valuation', key: 'targetPrice', width: 18 },
    { header: 'Published Date & Time (IST)', key: 'publishedAt', width: 24 },
    { header: 'Status', key: 'status', width: 14 }
  ];
  const rowHReports = wsReports.getRow(1);
  rowHReports.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Amber
  rowHReports.font = HEADER_FONT;
  rowHReports.height = 24;

  const reportRows = (data.researchReports || []).map((r: any) => ({
    title: r.title || 'N/A',
    segment: r.segment || 'EQUITY',
    type: r.type || 'TECHNICAL',
    recommendation: r.recommendation || 'N/A',
    targetPrice: r.targetPrice || 'N/A',
    publishedAt: (r.publishedAt || r.createdAt) ? new Date(r.publishedAt || r.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
    status: r.status || 'PUBLISHED'
  }));
  reportRows.forEach(r => wsReports.addRow(r));

  // --------------------------------------------------------------------------
  // TAB 5: KYC_Documents
  // --------------------------------------------------------------------------
  const wsKyc = wb.addWorksheet('KYC_Documents', { views: [{ showGridLines: true }] });
  wsKyc.columns = [
    { header: 'Document Type', key: 'docType', width: 22 },
    { header: 'File Name', key: 'fileName', width: 32 },
    { header: 'Verification Status', key: 'status', width: 20 },
    { header: 'Uploaded Date & Time (IST)', key: 'uploadedAt', width: 24 }
  ];
  const rowHKyc = wsKyc.getRow(1);
  rowHKyc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } }; // Cyan
  rowHKyc.font = HEADER_FONT;
  rowHKyc.height = 24;

  const kycRows = (data.documents || []).map((d: any) => ({
    docType: d.docType || 'IDENTITY_PROOF',
    fileName: d.fileName || 'document.pdf',
    status: d.status || 'VERIFIED',
    uploadedAt: (d.uploadedAt || d.createdAt) ? new Date(d.uploadedAt || d.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A'
  }));
  kycRows.forEach(d => wsKyc.addRow(d));

  // --------------------------------------------------------------------------
  // TAB 6: Signed_Agreements
  // --------------------------------------------------------------------------
  const wsAgr = wb.addWorksheet('Signed_Agreements', { views: [{ showGridLines: true }] });
  wsAgr.columns = [
    { header: 'Agreement Version', key: 'version', width: 20 },
    { header: 'eSign Mode', key: 'esignMode', width: 26 },
    { header: 'Signed Date & Time (IST)', key: 'signedAt', width: 24 },
    { header: 'Signer IP Address', key: 'ipAddress', width: 20 },
    { header: 'Status', key: 'status', width: 16 }
  ];
  const rowHAgr = wsAgr.getRow(1);
  rowHAgr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo
  rowHAgr.font = HEADER_FONT;
  rowHAgr.height = 24;

  const agrRows = (data.agreements || []).map((a: any) => ({
    version: a.version || '1.0',
    esignMode: a.esignMode || 'Aadhaar eSign (Digio)',
    signedAt: (a.signedAt || a.createdAt) ? new Date(a.signedAt || a.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
    ipAddress: a.ipAddress || 'N/A',
    status: a.status || 'SIGNED'
  }));
  agrRows.forEach(a => wsAgr.addRow(a));

  // --------------------------------------------------------------------------
  // TAB 7: Call_Recordings
  // --------------------------------------------------------------------------
  const wsCalls = wb.addWorksheet('Call_Recordings', { views: [{ showGridLines: true }] });
  wsCalls.columns = [
    { header: 'Call Category', key: 'callType', width: 18 },
    { header: 'Call Date & Time (IST)', key: 'callDate', width: 22 },
    { header: 'Duration (MM:SS)', key: 'duration', width: 16 },
    { header: 'Staff Member', key: 'callerStaff', width: 22 },
    { header: 'Summary / Purpose', key: 'summary', width: 35 },
    { header: 'Compliance Verified', key: 'verified', width: 20 },
    { header: 'Audio File Name', key: 'fileName', width: 30 }
  ];
  const rowH4 = wsCalls.getRow(1);
  rowH4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF881337' } }; // Dark Rose
  rowH4.font = HEADER_FONT;
  rowH4.height = 24;

  const recRows = (data.recordings || []).map((r: any) => {
    const sec = r.durationSeconds || 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const durStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return {
      callType: r.callType,
      callDate: r.callDate ? new Date(r.callDate).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
      duration: durStr,
      callerStaff: r.callerStaffName || 'Staff',
      summary: r.summary || '',
      verified: r.isComplianceVerified ? 'YES' : 'NO',
      fileName: r.fileName
    };
  });
  recRows.forEach(r => wsCalls.addRow(r));

  // --------------------------------------------------------------------------
  // TAB 8: Audit_Trail
  // --------------------------------------------------------------------------
  const wsAudit = wb.addWorksheet('Audit_Trail', { views: [{ showGridLines: true }] });
  wsAudit.columns = [
    { header: 'Timestamp (IST)', key: 'timestamp', width: 22 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Action Event', key: 'action', width: 24 },
    { header: 'Title / Event', key: 'title', width: 28 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'IP Address', key: 'ipAddress', width: 18 }
  ];
  const rowH5 = wsAudit.getRow(1);
  rowH5.fill = HEADER_FILL;
  rowH5.font = HEADER_FONT;
  rowH5.height = 24;

  const auditRows = (data.activityLogs || []).map((l: any) => ({
    timestamp: l.timestamp || l.createdAt ? new Date(l.timestamp || l.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
    category: l.category,
    action: l.action,
    title: l.title,
    description: l.description,
    ipAddress: l.ipAddress || ''
  }));
  auditRows.forEach(r => wsAudit.addRow(r));

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/**
 * Generates a Single-Sheet Excel Workbook (.xlsx)
 * Used when admin exports a specific subfolder directly.
 */
export const generateSingleSheetExcel = async (
  sheetName: string,
  columns: { header: string; key: string; width: number }[],
  rows: any[],
  themeColorHex = 'FF1E293B'
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SEBI Compliance System';
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
  ws.columns = columns;

  const headerRow = ws.getRow(1);
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: themeColorHex }
  };
  headerRow.font = HEADER_FONT;
  headerRow.height = 24;

  rows.forEach(r => ws.addRow(r));

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
