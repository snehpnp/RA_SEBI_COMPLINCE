import { Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import archiver = require('archiver');
import PDFDocument from 'pdfkit';
import { AuthenticatedRequest } from '../middlewares/auth';
import dynamicDb from '../config/db';
import { logActivity } from '../services/activityService';
import { logAudit } from '../services/auditService';
import { resolveAttachmentFilePath, generateAgreementPdf } from '../services/pdfService';
import { generateInvoicePdf } from '../services/invoiceGenerator';
import { generateMultiTabClientExcel, generateSingleSheetExcel } from '../services/vaultExcelService';

/**
 * Sanitizes a string for use in folder/file names across OS environments
 */
function sanitizeFileName(str: string): string {
  if (!str) return 'unknown';
  return str
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
}

/**
 * Converts array of objects into a properly escaped CSV string
 */
function generateCsv(headers: { key: string; label: string }[], data: any[]): string {
  const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map(item => {
    return headers.map(h => {
      let val = item[h.key];
      if (val === null || val === undefined) val = '';
      if (val instanceof Date) val = val.toISOString().replace('T', ' ').substring(0, 19);
      if (typeof val === 'object') val = JSON.stringify(val);
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });
  return [headerRow, ...rows].join('\r\n');
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Helper to build client folder name: [Client_Name]_[Mobile]_[Email]
 */
function buildClientFolderName(client: any): string {
  const name = sanitizeFileName(client.name || 'Client');
  const mobile = sanitizeFileName(client.mobile || 'NoPhone');
  const email = sanitizeFileName(client.email || 'NoEmail');
  return `${name}_${mobile}_${email}`;
}

/**
 * Formats multiple targets with slashes, e.g. "₹1300 / ₹1350 / ₹1400"
 */
function formatTradeTargets(s: any): string {
  const tgts: (string | number)[] = [];
  if (s.target1 !== undefined && s.target1 !== null && s.target1 !== '') tgts.push(`₹${s.target1}`);
  if (s.target2 !== undefined && s.target2 !== null && s.target2 !== '') tgts.push(`₹${s.target2}`);
  if (s.target3 !== undefined && s.target3 !== null && s.target3 !== '') tgts.push(`₹${s.target3}`);
  return tgts.length > 0 ? tgts.join(' / ') : `₹${s.target1 || '-'}`;
}

/**
 * Checks if a ResearchReport matches any of the client's traded stocks
 */
function matchReportToClientStocks(report: any, clientStockSymbols: string[], clientStockNames: string[]): { matched: boolean; symbol?: string; name?: string } {
  const textToSearch = `${report.title || ''} ${report.summary || ''} ${report.details || ''}`.toUpperCase();
  for (let i = 0; i < clientStockSymbols.length; i++) {
    const sym = clientStockSymbols[i];
    if (sym && sym.length >= 2) {
      const escapedSym = sym.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSym}\\b`, 'i');
      if (regex.test(textToSearch)) {
        return { matched: true, symbol: sym, name: clientStockNames[i] };
      }
    }
    const name = clientStockNames[i];
    if (name && name.length >= 3) {
      const cleanName = name.replace(/Limited|Ltd\.?|Corporation|Corp\.?/gi, '').trim().toUpperCase();
      if (cleanName.length >= 3 && textToSearch.includes(cleanName)) {
        return { matched: true, symbol: sym, name };
      }
    }
  }
  return { matched: false };
}


/**
 * Generates an on-demand PDF for research reports if physical PDF file is not on disk
 */
function generateResearchReportPdf(report: any, tenant: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ compress: false, margins: { top: 40, bottom: 40, left: 45, right: 45 } });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const companyName = tenant?.companyName || 'Alpha Research Partners';
      const sebiReg = tenant?.sebiRegistration || 'SEBI Registered Research Analyst';

      // Header Banner
      doc.fillColor('#1E3A8A').fontSize(16).font('Helvetica-Bold').text(report.title || 'RESEARCH ANALYST REPORT', { align: 'center' });
      doc.moveDown(0.3);
      doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(`${companyName} | SEBI Reg: ${sebiReg}`, { align: 'center' });
      doc.moveDown(0.2);
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text(`Segment: ${report.segment || 'EQUITY'} | Type: ${report.type || 'TECHNICAL'} | Dispatched: ${new Date(report.publishedAt || report.createdAt).toLocaleString()}`, { align: 'center' });
      doc.moveDown(0.6);
      doc.moveTo(45, doc.y).lineTo(550, doc.y).strokeColor('#CBD5E1').stroke();
      doc.moveDown(1);

      // Recommendation Box
      if (report.recommendation || report.targetPrice) {
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(`Analyst Recommendation: ${report.recommendation || 'BUY'}`);
        if (report.targetPrice) {
          doc.moveDown(0.2);
          doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(`Target Valuation Price: ₹${report.targetPrice}`);
        }
        doc.moveDown(0.8);
      }

      // Summary
      doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text('Executive Summary:');
      doc.moveDown(0.2);
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(report.summary || 'Comprehensive market research and price action analysis.', { lineGap: 3 });
      doc.moveDown(0.8);

      // Details
      if (report.details) {
        doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold').text('Fundamental / Technical Analysis:');
        doc.moveDown(0.2);
        const cleanDetails = report.details.replace(/<[^>]*>/g, '').trim();
        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(cleanDetails, { lineGap: 3 });
        doc.moveDown(1);
      }

      // Regulatory Disclosures & Disclaimer
      doc.moveDown(1);
      doc.fillColor('#DC2626').fontSize(8.5).font('Helvetica-Bold').text('Mandatory SEBI Regulatory Disclosures:');
      doc.moveDown(0.2);
      const disclaimer = report.disclaimer || 'Investment in securities market are subject to market risks. Read all the related documents carefully before investing. Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.';
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(disclaimer, { align: 'justify', lineGap: 2 });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ============================================================================
// 1. LIST CLIENT VAULTS (with Plan Status Filter & Registration Sorting)
// ============================================================================
export const listClientVaults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context is missing.' });

    const { search, planStatusFilter = 'ALL', page = '1', limit = '100' } = req.query as {
      search?: string;
      planStatusFilter?: string;
      page?: string;
      limit?: string;
    };
    const query: any = { tenantId, deletedAt: null };

    if (search && search.trim()) {
      const s = search.trim();
      const orConditions: any[] = [
        { name: { $regex: s, $options: 'i' } },
        { mobile: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { pan: { $regex: s, $options: 'i' } }
      ];

      // Date parsing if user searched by date string (e.g. 2026-09-24 or 24/09/2026)
      const dMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dMatch) {
        const parsedDate = new Date(`${dMatch[3]}-${dMatch[2]}-${dMatch[1]}`);
        if (!isNaN(parsedDate.getTime())) {
          const nextDay = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000);
          orConditions.push({ createdAt: { $gte: parsedDate, $lt: nextDay } });
        }
      }

      query.$or = orConditions;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    // Fetch clients strictly ordered by latest registration timestamp (newest first)
    const [totalClients, clients] = await Promise.all([
      dynamicDb.Client.countDocuments(query),
      dynamicDb.Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean()
    ]);

    const clientIds = clients.map((c: any) => c._id || c.id);
    const now = new Date();

    // Parallel aggregate stats for these clients
    const [subCounts, docCounts, recCounts, agrCounts, activePlansList] = await Promise.all([
      dynamicDb.Subscription.aggregate([
        { $match: { clientId: { $in: clientIds } } },
        {
          $group: {
            _id: '$clientId',
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'ACTIVE'] },
                      { $gt: ['$endDate', now] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      dynamicDb.ClientDocument.aggregate([
        { $match: { clientId: { $in: clientIds } } },
        { $group: { _id: '$clientId', count: { $sum: 1 } } }
      ]),
      dynamicDb.ClientCallRecording.aggregate([
        { $match: { clientId: { $in: clientIds } } },
        { $group: { _id: '$clientId', count: { $sum: 1 } } }
      ]),
      dynamicDb.Agreement.aggregate([
        { $match: { clientId: { $in: clientIds } } },
        { $group: { _id: '$clientId', count: { $sum: 1 } } }
      ]),
      dynamicDb.Subscription.find({
        clientId: { $in: clientIds },
        status: 'ACTIVE',
        endDate: { $gt: now }
      }).populate('plan', 'name').lean()
    ]);

    const subMap = new Map(subCounts.map((s: any) => [String(s._id), s]));
    const docMap = new Map(docCounts.map((d: any) => [String(d._id), d.count]));
    const recMap = new Map(recCounts.map((r: any) => [String(r._id), r.count]));
    const agrMap = new Map(agrCounts.map((a: any) => [String(a._id), a.count]));

    // Map active plan names per client
    const clientActivePlansMap = new Map<string, string[]>();
    for (const sub of ((activePlansList as any[]) || [])) {
      const cId = String(sub.clientId);
      const planName = (sub.plan as any)?.name || 'Active Plan';
      const existing = clientActivePlansMap.get(cId) || [];
      if (!existing.includes(planName)) existing.push(planName);
      clientActivePlansMap.set(cId, existing);
    }

    let vaults = clients.map((client: any) => {
      const cId = String(client._id || client.id);
      const subs = subMap.get(cId) || { total: 0, active: 0 };
      const folderName = buildClientFolderName(client);

      // Determine plan status category
      let planStatus: 'ACTIVE_PLAN' | 'EXPIRED_PLAN' | 'NO_PLAN' = 'NO_PLAN';
      if (subs.active > 0) {
        planStatus = 'ACTIVE_PLAN';
      } else if (subs.total > 0) {
        planStatus = 'EXPIRED_PLAN';
      } else {
        planStatus = 'NO_PLAN';
      }

      const activePlanNames = clientActivePlansMap.get(cId) || [];

      const regDate = client.createdAt ? new Date(client.createdAt) : new Date();
      const registeredAtFormatted = regDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return {
        clientId: cId,
        name: client.name,
        mobile: client.mobile,
        email: client.email,
        pan: client.pan,
        category: client.category || 'INDIVIDUAL',
        status: client.status || 'ACTIVE',
        kycStatus: client.kycStatus || 'PENDING',
        agreementStatus: client.agreementStatus || 'PENDING',
        registeredAt: client.createdAt,
        registeredAtFormatted,
        folderName,
        planStatus,
        activePlanNames,
        metrics: {
          totalSubscriptions: subs.total,
          activeSubscriptions: subs.active,
          documentsCount: docMap.get(cId) || 0,
          recordingsCount: recMap.get(cId) || 0,
          agreementsCount: agrMap.get(cId) || 0,
          totalFilesEstimated: (docMap.get(cId) || 0) + (recMap.get(cId) || 0) + (agrMap.get(cId) || 0) + (subs.total || 0)
        }
      };
    });

    // Apply plan status filter if requested
    if (planStatusFilter && planStatusFilter !== 'ALL') {
      if (planStatusFilter === 'ACTIVE') {
        vaults = vaults.filter(v => v.planStatus === 'ACTIVE_PLAN');
      } else if (planStatusFilter === 'EXPIRED') {
        vaults = vaults.filter(v => v.planStatus === 'EXPIRED_PLAN');
      } else if (planStatusFilter === 'NO_PLAN') {
        vaults = vaults.filter(v => v.planStatus === 'NO_PLAN');
      }
    }

    return res.status(200).json({
      success: true,
      data: vaults,
      totalCount: totalClients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: vaults.length,
        pages: Math.ceil(totalClients / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error in listClientVaults:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 2. GET CLIENT VAULT DETAILS (8 Sub-Folders + Virtual Files & Purchase Dates)
// ============================================================================
export const getClientVaultDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    if (!clientId) return res.status(400).json({ success: false, message: 'Client ID required.' });

    const client: any = await dynamicDb.Client.findOne({ _id: clientId, tenantId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client vault not found.' });
    }

    const folderName = buildClientFolderName(client);

    // Parallel fetch all data required for 8 subfolders
    const [
      clientProfile,
      userAccount,
      subscriptions,
      payments,
      documents,
      agreements,
      recordings,
      activityLogs,
      researchReports
    ] = await Promise.all([
      dynamicDb.ClientProfile.findOne({ clientId: client._id }).lean(),
      client.userId ? dynamicDb.User.findById(client.userId).lean() : null,
      dynamicDb.Subscription.find({ clientId: client._id }).populate('plan').sort({ createdAt: -1 }).lean(),
      dynamicDb.Payment.find({ clientId: client._id }).sort({ createdAt: -1 }).lean(),
      dynamicDb.ClientDocument.find({ clientId: client._id }).sort({ uploadedAt: -1 }).lean(),
      dynamicDb.Agreement.find({ clientId: client._id }).sort({ signedAt: -1 }).lean(),
      dynamicDb.ClientCallRecording.find({ clientId: client._id, tenantId }).sort({ callDate: -1, createdAt: -1 }).lean(),
      dynamicDb.ActivityLog.find({ targetClientId: client._id }).sort({ timestamp: -1 }).limit(100).lean(),
      dynamicDb.ResearchReport.find({ tenantId, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(50).lean()
    ]);

    // Trade signals related strictly to client's subscribed plans
    const planIds = (subscriptions || [])
      .map((s: any) => s.planId || s.plan?._id)
      .filter(Boolean);

    let signals: any[] = [];
    if (planIds.length > 0) {
      signals = await dynamicDb.Signal.find({ planId: { $in: planIds } })
        .populate('stockId')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
    }

    // Extract all unique stock symbols & names from client's signals (open or closed)
    const clientStockSymbols: string[] = [];
    const clientStockNames: string[] = [];
    signals.forEach((s: any) => {
      const sym = (s.stockId?.symbol || s.stockSymbol || '').trim();
      const name = (s.stockId?.name || s.stockName || '').trim();
      if (sym && !clientStockSymbols.includes(sym)) {
        clientStockSymbols.push(sym);
        clientStockNames.push(name || sym);
      }
    });

    // Build client research reports:
    // 1) Direct trade signal attachments uploaded by researcher (signal.reportUrl)
    // 2) Published ResearchReport documents matching client's traded stocks (open or closed)
    const clientResearchReports: any[] = [];

    // Direct trade signal attachments
    signals.forEach((sig: any) => {
      if (sig.reportUrl) {
        const sym = sig.stockId?.symbol || sig.stockSymbol || 'Trade';
        const name = sig.stockId?.name || sig.stockName || sym;
        clientResearchReports.push({
          _id: sig._id,
          title: `Research Report - ${sym} (${sig.callType || 'Advisory Call'})`,
          stockSymbol: sym,
          stockName: name,
          segment: sig.segment || 'EQUITY',
          type: sig.callType || 'BUY',
          recommendation: sig.callType || 'BUY',
          targetPrice: sig.target1,
          summary: sig.description || `Comprehensive research analysis attached to ${sym} recommendation.`,
          publishedAt: sig.createdAt,
          fileUrl: sig.reportUrl,
          isAttachment: true,
          tradeStatus: sig.status === 'ACTIVE' || sig.status === 'OPEN' ? 'OPEN' : 'CLOSED',
          status: 'PUBLISHED'
        });
      }
    });

    // Research module reports matching client's traded stocks
    if (clientStockSymbols.length > 0) {
      (researchReports || []).forEach((rep: any) => {
        const match = matchReportToClientStocks(rep, clientStockSymbols, clientStockNames);
        if (match.matched) {
          const hasOpenTrade = signals.some((s: any) => {
            const sym = (s.stockId?.symbol || s.stockSymbol || '').trim().toUpperCase();
            return sym === match.symbol?.toUpperCase() && (s.status === 'ACTIVE' || s.status === 'OPEN');
          });
          clientResearchReports.push({
            ...rep,
            stockSymbol: match.symbol,
            stockName: match.name,
            fileUrl: null, // Dynamic on-demand PDF generation
            isAttachment: false,
            tradeStatus: hasOpenTrade ? 'OPEN' : 'CLOSED'
          });
        }
      });
    }

    // Compute Trade Signals Performance Metrics
    const openTrades = signals.filter((s: any) => s.status === 'ACTIVE');
    const closedTrades = signals.filter((s: any) => s.status === 'CLOSED');
    const targetHitTrades = signals.filter((s: any) => s.closeStatus === 'TARGET_HIT');
    const slHitTrades = signals.filter((s: any) => s.closeStatus === 'SL_HIT');
    const winRate = closedTrades.length > 0 ? Math.round((targetHitTrades.length / closedTrades.length) * 100) : 0;

    // Enrich Subscriptions with exact purchase timestamp & invoice download URL
    const enrichedSubscriptions = (subscriptions || []).map((sub: any) => {
      const sId = String(sub._id || sub.id);
      const matchingPayment = (payments || []).find((p: any) => {
        if (sub.paymentId && String(p._id) === String(sub.paymentId)) return true;
        if (sub.paymentId && p.transactionRef === sub.paymentId) return true;
        if (String(p.planId) === String(sub.planId || sub.plan?._id)) return true;
        return false;
      });

      const purchaseDate = sub.createdAt || matchingPayment?.createdAt || sub.startDate;
      const isExpired = new Date(sub.endDate) < new Date() || sub.status === 'EXPIRED';
      const computedStatus = sub.status === 'CANCELLED' ? 'CANCELLED' : isExpired ? 'EXPIRED' : sub.status;

      const paymentId = matchingPayment?._id ? String(matchingPayment._id) : (sub.paymentId || sId);

      return {
        ...sub,
        purchaseDate,
        purchaseDateFormatted: new Date(purchaseDate).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        }),
        planName: sub.plan?.name || 'Advisory Plan',
        segment: sub.plan?.researchSegments || sub.segment || 'N/A',
        durationMonths: sub.plan?.durationMonths || 1,
        amount: sub.amount || sub.amountTotal || sub.plan?.price || 0,
        computedStatus,
        paymentMode: (matchingPayment as any)?.paymentMode || (sub as any).paymentMode || 'Online',
        transactionRef: (matchingPayment as any)?.transactionRef || (matchingPayment as any)?.gatewayPaymentId || (sub as any).paymentId || 'N/A',
        paymentStatus: (matchingPayment as any)?.status || 'SUCCESS',
        paymentId,
        invoiceDownloadUrl: `/api/v1/admin/vaults/${client._id}/invoice/${paymentId}`
      };
    });

    const enrichedPayments = (payments || []).map((p: any) => ({
      ...p,
      paymentDateFormatted: new Date(p.createdAt || p.paymentDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }),
      invoiceDownloadUrl: `/api/v1/admin/vaults/${client._id}/invoice/${p._id}`
    }));

    const enrichedAgreements = (agreements || []).map((a: any) => ({
      ...a,
      signedAtFormatted: a.signedAt ? new Date(a.signedAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      }) : 'Not Signed',
      agreementDownloadUrl: `/api/v1/admin/vaults/${client._id}/agreement`
    }));

    // Build the 8 Desktop Sub-Folders Data Representation
    const folders = {
      basicProfile: {
        key: '01_Basic_Profile',
        title: '01. Basic Profile & Registration',
        description: 'Account Dossier, KYC Bio, Risk Profiling, Contact Details',
        fileCount: 1,
        data: {
          client,
          profile: clientProfile,
          user: userAccount ? {
            id: (userAccount as any)._id,
            email: (userAccount as any).email,
            status: (userAccount as any).status,
            createdAt: (userAccount as any).createdAt,
            lastLogin: (userAccount as any).lastLogin
          } : null
        }
      },
      subscriptions: {
        key: '02_Subscriptions_&_Invoices',
        title: '02. Subscriptions & Invoices',
        description: 'Active/Expired Advisory Plans, Payments & Tax Invoices',
        fileCount: (enrichedSubscriptions.length || 0) + (enrichedPayments.length || 0),
        data: {
          subscriptions: enrichedSubscriptions,
          payments: enrichedPayments
        }
      },
      tradeSignals: {
        key: '03_Trade_Signals',
        title: '03. Trade Signals & Advisory Calls',
        description: 'Open vs. Closed Recommendations, Targets Hit, Stoploss & P&L',
        fileCount: signals.length,
        metrics: {
          totalTrades: signals.length,
          openTradesCount: openTrades.length,
          closedTradesCount: closedTrades.length,
          targetHitCount: targetHitTrades.length,
          stoplossHitCount: slHitTrades.length,
          winRatePercentage: winRate
        },
        data: signals.map((s: any) => {
          let pnlPercent: number | null = null;
          if (s.exitPrice && s.entryPrice) {
            if (s.callType === 'BUY') {
              pnlPercent = parseFloat((((s.exitPrice - s.entryPrice) / s.entryPrice) * 100).toFixed(2));
            } else if (s.callType === 'SELL') {
              pnlPercent = parseFloat((((s.entryPrice - s.exitPrice) / s.entryPrice) * 100).toFixed(2));
            }
          }

          const targetsFormatted = formatTradeTargets(s);
          const openedAtFormatted = s.createdAt
            ? new Date(s.createdAt).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              })
            : 'N/A';
          const closedAtFormatted = s.closedAt
            ? new Date(s.closedAt).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
              })
            : (s.status === 'ACTIVE' || s.status === 'OPEN' ? 'Open / Active' : '-');

          return {
            ...s,
            stockSymbol: s.stockId?.symbol || s.stockSymbol || 'N/A',
            stockName: s.stockId?.name || s.stockName || 'Stock',
            targetsFormatted,
            openedAtFormatted,
            closedAtFormatted,
            pnlPercent
          };
        })
      },
      researchReports: {
        key: '04_Research_Reports',
        title: '04. Research Reports',
        description: 'Macro, Fundamental, and Technical Analyst Research PDFs for Traded Stocks',
        fileCount: clientResearchReports.length,
        data: clientResearchReports
      },

      kycDocuments: {
        key: '05_KYC_Documents',
        title: '05. KYC Documents & Identity Proofs',
        description: 'PAN Card, Aadhaar, DigiLocker Verification Dossier',
        fileCount: documents.length,
        data: documents
      },
      agreements: {
        key: '06_Signed_Agreements',
        title: '06. Signed Advisory Agreements',
        description: 'SEBI Mandatory Client Agreements & Aadhaar eSign Audit Records',
        fileCount: enrichedAgreements.length,
        data: enrichedAgreements
      },
      callRecordings: {
        key: '07_Call_Recordings',
        title: '07. Audio Call Recordings',
        description: 'SEBI Compliance Call Recordings, Advisory Audio & Transcripts',
        fileCount: recordings.length,
        data: recordings
      },
      auditTrail: {
        key: '08_Audit_Trail',
        title: '08. Audit Trail & Access Logs',
        description: 'Login Timestamps, OTP Verifications, IP Addresses, Consent Logs',
        fileCount: activityLogs.length,
        data: activityLogs
      }
    };

    return res.status(200).json({
      success: true,
      data: {
        client: {
          id: client._id,
          name: client.name,
          mobile: client.mobile,
          email: client.email,
          pan: client.pan,
          category: client.category,
          status: client.status,
          agreementSigned: Boolean(client.agreementSigned || (agreements && agreements.length > 0)),
          registeredAt: client.createdAt,
          registeredAtFormatted: new Date(client.createdAt).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          })
        },
        folderName,
        folders
      }
    });
  } catch (error: any) {
    console.error('Error in getClientVaultDetails:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 3. UPLOAD AUDIO CALL RECORDING
// ============================================================================
export const uploadCallRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    if (!clientId) return res.status(400).json({ success: false, message: 'Client ID missing.' });

    const client: any = await dynamicDb.Client.findOne({ _id: clientId, tenantId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio recording file uploaded.' });
    }

    const {
      title = req.file.originalname,
      callType = 'ADVISORY',
      callDate = new Date(),
      durationSeconds = 0,
      callerStaffName = (req.user as any)?.name || (req.user as any)?.email || 'Compliance Staff',
      callerStaffId = req.user?.id,
      summary = '',
      isComplianceVerified = true
    } = req.body;

    const fileUrl = `/uploads/recordings/${req.file.filename}`;
    const parsedDuration = parseInt(String(durationSeconds), 10) || 0;

    const validCallTypes = ['INBOUND', 'OUTBOUND', 'ADVISORY', 'ONBOARDING', 'COMPLAINT', 'RISK_PROFILE'];
    const safeCallType = validCallTypes.includes(String(callType).toUpperCase())
      ? (String(callType).toUpperCase() as any)
      : 'ADVISORY';

    const newRecording: any = await dynamicDb.ClientCallRecording.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      clientId: new mongoose.Types.ObjectId(clientId),
      title: title || req.file.originalname,
      callType: safeCallType,
      callDate: new Date(callDate),
      durationSeconds: parsedDuration,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      callerStaffId: callerStaffId && mongoose.Types.ObjectId.isValid(callerStaffId) ? new mongoose.Types.ObjectId(callerStaffId) : undefined,
      callerStaffName,
      clientPhone: client.mobile || '',
      summary: summary || `Call recording with client ${client.name}`,
      isComplianceVerified: String(isComplianceVerified) === 'true' || isComplianceVerified === true
    });

    // Write to Activity Log so it is reflected in the audit trail & timeline
    await logActivity({
      tenantId,
      actorId: req.user?.id,
      actorType: 'STAFF',
      actorName: callerStaffName,
      targetClientId: client._id,
      category: 'STAFF_ACTION',
      action: 'CALL_RECORDING_UPLOADED',
      title: 'Call Recording Secured in Vault',
      description: `Uploaded ${safeCallType} recording: "${req.file.originalname}" (${formatDuration(parsedDuration)}) by ${callerStaffName}`,
      metadata: {
        recordingId: newRecording._id,
        fileName: req.file.originalname,
        callType: safeCallType,
        durationSeconds: parsedDuration,
        fileUrl
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Call recording successfully uploaded and indexed in Client Vault.',
      data: newRecording
    });
  } catch (error: any) {
    console.error('Error in uploadCallRecording:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 4. DELETE CALL RECORDING
// ============================================================================
export const deleteCallRecording = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId, recordingId } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const recording: any = await dynamicDb.ClientCallRecording.findOne({
      _id: recordingId,
      clientId,
      tenantId
    });

    if (!recording) {
      return res.status(404).json({ success: false, message: 'Call recording not found.' });
    }

    // Try deleting physical file
    if (recording.fileUrl) {
      const physicalPath = resolveAttachmentFilePath(recording.fileUrl);
      if (physicalPath && fs.existsSync(physicalPath)) {
        try { fs.unlinkSync(physicalPath); } catch {}
      }
    }

    await dynamicDb.ClientCallRecording.findByIdAndDelete(recordingId);

    // Activity Log
    await logActivity({
      tenantId,
      actorId: req.user?.id,
      actorType: 'STAFF',
      targetClientId: clientId,
      category: 'STAFF_ACTION',
      action: 'CALL_RECORDING_DELETED',
      title: 'Call Recording Removed',
      description: `Deleted recording: ${recording.fileName}`,
      metadata: { recordingId, fileName: recording.fileName }
    });

    return res.status(200).json({
      success: true,
      message: 'Call recording deleted successfully.'
    });
  } catch (error: any) {
    console.error('Error in deleteCallRecording:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// 5. DOWNLOAD SINGLE INVOICE PDF
// ============================================================================
export const downloadSingleInvoice = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    if (!paymentId) return res.status(400).json({ success: false, message: 'Payment ID is required.' });

    const pdfBuffer = await generateInvoicePdf(paymentId);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice PDF could not be generated.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${paymentId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error in downloadSingleInvoice:', error);
    return res.status(500).json({ success: false, message: error.message || 'Invoice generation error' });
  }
};

// ============================================================================
// 6. DOWNLOAD SIGNED ADVISORY AGREEMENT PDF
// ============================================================================
export const downloadAgreementPdf = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientId } = req.params;
    if (!clientId) return res.status(400).json({ success: false, message: 'Client ID is required.' });

    const client: any = await dynamicDb.Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    // Check physical file on disk first
    const agreement: any = await dynamicDb.Agreement.findOne({ clientId }).sort({ signedAt: -1 }).lean();
    if (agreement?.agreementUrl) {
      const physical = resolveAttachmentFilePath(agreement.agreementUrl);
      if (physical && fs.existsSync(physical)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Signed_Agreement_${sanitizeFileName(client.name)}.pdf"`);
        return res.sendFile(physical);
      }
    }

    // Dynamic SEBI advisory agreement generation
    const pdfBuffer = await generateAgreementPdf(clientId, { isSigned: true });
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(404).json({ success: false, message: 'Agreement PDF generation failed.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Signed_Agreement_${sanitizeFileName(client.name)}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error in downloadAgreementPdf:', error);
    return res.status(500).json({ success: false, message: error.message || 'Agreement generation error' });
  }
};

// ============================================================================
// 7. EXPORT COMPLETE CLIENT VAULT (ZIP with 8 Sub-Folders + Complete PDFs & CSVs)
// ============================================================================
export const exportClientVaultZip = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const client: any = await dynamicDb.Client.findOne({ _id: clientId, tenantId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();
    const folderName = buildClientFolderName(client);

    // Parallel fetch all data
    const [
      clientProfile,
      userAccount,
      subscriptions,
      payments,
      documents,
      agreements,
      recordings,
      activityLogs,
      researchReports
    ] = await Promise.all([
      dynamicDb.ClientProfile.findOne({ clientId: client._id }).lean(),
      client.userId ? dynamicDb.User.findById(client.userId).lean() : null,
      dynamicDb.Subscription.find({ clientId: client._id }).populate('plan').sort({ createdAt: -1 }).lean(),
      dynamicDb.Payment.find({ clientId: client._id }).sort({ createdAt: -1 }).lean(),
      dynamicDb.ClientDocument.find({ clientId: client._id }).sort({ uploadedAt: -1 }).lean(),
      dynamicDb.Agreement.find({ clientId: client._id }).sort({ signedAt: -1 }).lean(),
      dynamicDb.ClientCallRecording.find({ clientId: client._id, tenantId }).sort({ callDate: -1, createdAt: -1 }).lean(),
      dynamicDb.ActivityLog.find({ targetClientId: client._id }).sort({ timestamp: -1 }).limit(500).lean(),
      dynamicDb.ResearchReport.find({ tenantId, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(50).lean()
    ]);

    // Trade signals related strictly to client's subscribed plans
    const planIds = (subscriptions || []).map((s: any) => s.planId || s.plan?._id).filter(Boolean);
    const signals: any[] = planIds.length > 0
      ? await dynamicDb.Signal.find({ planId: { $in: planIds } }).populate('stockId').sort({ createdAt: -1 }).lean()
      : [];

    // Extract all unique stock symbols & names from client's signals (open or closed)
    const clientStockSymbols: string[] = [];
    const clientStockNames: string[] = [];
    signals.forEach((s: any) => {
      const sym = (s.stockId?.symbol || s.stockSymbol || '').trim();
      const name = (s.stockId?.name || s.stockName || '').trim();
      if (sym && !clientStockSymbols.includes(sym)) {
        clientStockSymbols.push(sym);
        clientStockNames.push(name || sym);
      }
    });

    // Build client research reports (attachments + matched research reports)
    const clientResearchReports: any[] = [];
    signals.forEach((sig: any) => {
      if (sig.reportUrl) {
        const sym = sig.stockId?.symbol || sig.stockSymbol || 'Trade';
        const name = sig.stockId?.name || sig.stockName || sym;
        clientResearchReports.push({
          _id: sig._id,
          title: `Research Report - ${sym} (${sig.callType || 'Advisory Call'})`,
          stockSymbol: sym,
          stockName: name,
          segment: sig.segment || 'EQUITY',
          type: sig.callType || 'BUY',
          recommendation: sig.callType || 'BUY',
          targetPrice: sig.target1,
          summary: sig.description || `Attached research analysis for ${sym}`,
          publishedAt: sig.createdAt,
          fileUrl: sig.reportUrl,
          isAttachment: true,
          status: 'PUBLISHED'
        });
      }
    });

    if (clientStockSymbols.length > 0) {
      (researchReports || []).forEach((rep: any) => {
        const match = matchReportToClientStocks(rep, clientStockSymbols, clientStockNames);
        if (match.matched) {
          clientResearchReports.push({
            ...rep,
            stockSymbol: match.symbol,
            stockName: match.name,
            fileUrl: null,
            isAttachment: false
          });
        }
      });
    }

    // Prepare HTTP response headers for zip stream
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    const archive = (typeof (archiver as any) === 'function')
      ? (archiver as any)('zip', { zlib: { level: 9 } })
      : new (archiver as any).ZipArchive({ zlib: { level: 9 } });

    archive.pipe(res);

    archive.on('error', (err: any) => {
      console.error('Archiver error in exportClientVaultZip:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: err.message });
      }
    });

    // ------------------------------------------------------------------------
    // ROOT README FILE
    // ------------------------------------------------------------------------
    const readmeContent = `
================================================================================
CLIENT DIGITAL VAULT DOSSIER - SEBI REGULATORY COMPLIANCE EXPORT
================================================================================
Client Name:        ${client.name || 'N/A'}
Contact Phone:      ${client.mobile || 'N/A'}
Email Address:      ${client.email || 'N/A'}
PAN Card:           ${client.pan || 'N/A'}
Client Category:    ${client.category || 'INDIVIDUAL'}
Registration Date:  ${client.createdAt ? new Date(client.createdAt).toLocaleString() : 'N/A'}

Advisory Entity:    ${tenant?.companyName || 'SEBI Registered Research Analyst'}
SEBI Reg. Number:   ${tenant?.sebiRegistration || 'N/A'}
Export Date & Time: ${new Date().toLocaleString()}

CONTENTS OF THIS DOSSIER:
- 01_Basic_Profile/: Complete client master bio, KYC profile, and user account dossier.
- 02_Subscriptions_&_Invoices/: Active and historical plans, payments ledger, and invoice PDFs.
- 03_Trade_Signals/: Trade recommendations ledger (Open vs Closed, Targets Hit, Stoploss & P&L).
- 04_Research_Reports/: Published technical and fundamental research reports (with PDFs).
- 05_KYC_Documents/: Client identity proofs (PAN, Aadhaar, DigiLocker verification certificates).
- 06_Signed_Agreements/: SEBI-mandated advisory service agreement (Official Signed PDF & Aadhaar eSign records).
- 07_Call_Recordings/: Recorded telephone conversations, audio calls (.mp3/.wav), and call metadata ledger.
- 08_Audit_Trail/: Complete immutable activity logs (Signups, OTP verifications, login IPs, and staff actions).

CONFIDENTIALITY & REGULATORY NOTICE:
This digital vault dossier contains privileged regulatory records maintained under SEBI (Research Analysts)
Regulations, 2014. Unauthorized reproduction, transmission, or dissemination is strictly prohibited.
================================================================================
`.trim();
    archive.append(readmeContent, { name: `${folderName}/README_VAULT_DOSSIER.txt` });

    const safeClientTag = `${sanitizeFileName(client.name)}_${sanitizeFileName(client.mobile || 'client')}`;

    // ------------------------------------------------------------------------
    // CONSOLIDATED MASTER MULTI-TAB EXCEL WORKBOOK (SEBI Regulatory Dossier)
    // All tabular data (Profile, Subscriptions, Signals, Reports, KYC, Agreements, Audio, Audit)
    // is unified into ONE master .xlsx spreadsheet with 8 distinct tabs!
    // ------------------------------------------------------------------------
    try {
      const masterExcelBuffer = await generateMultiTabClientExcel({
        client,
        clientProfile,
        subscriptions,
        payments,
        tradeSignals: signals,
        recordings,
        activityLogs,
        documents,
        researchReports: clientResearchReports,
        agreements
      });
      archive.append(masterExcelBuffer, {
        name: `${folderName}/Client_Master_Compliance_Dossier_${safeClientTag}.xlsx`
      });
    } catch (excelErr) {
      console.error('Failed to generate master multi-tab Excel workbook:', excelErr);
    }

    // ------------------------------------------------------------------------
    // SUBFOLDER 02: Invoices (Official Tax Invoices as Individual PDFs)
    // ------------------------------------------------------------------------
    const targetInvoiceIds = new Set<string>();
    for (const p of (payments || [])) targetInvoiceIds.add(String(p._id));
    for (const s of (subscriptions || [])) {
      if ((s as any).paymentId) targetInvoiceIds.add(String((s as any).paymentId));
      else targetInvoiceIds.add(String(s._id));
    }

    for (const id of Array.from(targetInvoiceIds)) {
      try {
        const invoicePdf = await generateInvoicePdf(id);
        if (invoicePdf && invoicePdf.length > 0) {
          archive.append(invoicePdf, {
            name: `${folderName}/02_Subscriptions_&_Invoices/Tax_Invoice_${id}.pdf`
          });
        }
      } catch (err) {
        console.warn(`Could not append invoice PDF for ${id}:`, err);
      }
    }

    // ------------------------------------------------------------------------
    // SUBFOLDER 04: Research Reports (Official Research Reports for Traded Stocks)
    // ------------------------------------------------------------------------
    for (const report of clientResearchReports) {
      try {
        if (report.isAttachment && report.fileUrl) {
          const physical = resolveAttachmentFilePath(report.fileUrl);
          if (physical && fs.existsSync(physical)) {
            const ext = path.extname(report.fileUrl) || '.pdf';
            const safeTitle = sanitizeFileName(report.title || 'Research_Report');
            archive.file(physical, { name: `${folderName}/04_Research_Reports/${safeTitle}${ext}` });
          }
        } else {
          const reportPdf = await generateResearchReportPdf(report, tenant);
          if (reportPdf && reportPdf.length > 0) {
            const safeTitle = sanitizeFileName(report.title || 'Report');
            archive.append(reportPdf, { name: `${folderName}/04_Research_Reports/${safeTitle}_${report._id}.pdf` });
          }
        }
      } catch (err) {
        console.warn('Research report PDF generation failed:', err);
      }
    }


    // ------------------------------------------------------------------------
    // SUBFOLDER 05: KYC Documents (Client Verification Proof Files from disk)
    // ------------------------------------------------------------------------
    for (const doc of documents || []) {
      if (doc.fileUrl) {
        const physical = resolveAttachmentFilePath(doc.fileUrl);
        if (physical && fs.existsSync(physical)) {
          const ext = path.extname(doc.fileUrl) || path.extname(doc.fileName) || '.pdf';
          const safeName = sanitizeFileName(`${doc.docType}_${doc.fileName.replace(/\.[^/.]+$/, '')}`);
          archive.file(physical, { name: `${folderName}/05_KYC_Documents/${safeName}${ext}` });
        }
      }
    }

    // ------------------------------------------------------------------------
    // SUBFOLDER 06: Signed Agreements (Official Advisory Agreement PDF)
    // ------------------------------------------------------------------------
    let appendedAgreementPdf = false;
    for (const agr of agreements || []) {
      if (agr.agreementUrl) {
        const physical = resolveAttachmentFilePath(agr.agreementUrl);
        if (physical && fs.existsSync(physical)) {
          const dateStr = new Date(agr.signedAt || Date.now()).toISOString().split('T')[0];
          archive.file(physical, { name: `${folderName}/06_Signed_Agreements/Signed_Agreement_${dateStr}.pdf` });
          appendedAgreementPdf = true;
        }
      }
    }

    // Fallback: If client is marked agreementSigned or has agreement records, generate PDF!
    if (!appendedAgreementPdf && (client.agreementSigned || (agreements && agreements.length > 0))) {
      try {
        const agrPdf = await generateAgreementPdf(String(client._id), { isSigned: true });
        if (agrPdf && agrPdf.length > 0) {
          archive.append(agrPdf, { name: `${folderName}/06_Signed_Agreements/Official_Signed_Agreement.pdf` });
        }
      } catch (err) {
        console.warn('Agreement dynamic PDF fallback failed:', err);
      }
    }

    // ------------------------------------------------------------------------
    // SUBFOLDER 07: Call Recordings (Client Audio Recording Files)
    // ------------------------------------------------------------------------
    for (const rec of recordings || []) {
      if (rec.fileUrl) {
        const physical = resolveAttachmentFilePath(rec.fileUrl);
        if (physical && fs.existsSync(physical)) {
          const ext = path.extname(rec.fileUrl) || path.extname(rec.fileName) || '.mp3';
          const safeName = sanitizeFileName(`${rec.callType}_${rec.fileName.replace(/\.[^/.]+$/, '')}`);
          archive.file(physical, { name: `${folderName}/07_Call_Recordings/${safeName}${ext}` });
        }
      }
    }

    // Finalize the archive stream
    await archive.finalize();

    // Log the download action in audit trail
    await logActivity({
      tenantId,
      actorId: req.user?.id,
      actorType: 'ADMIN',
      targetClientId: client._id,
      category: 'STAFF_ACTION',
      action: 'CLIENT_VAULT_EXPORTED',
      title: 'Full Client Vault Exported (ZIP)',
      description: `Complete regulatory digital vault archive downloaded for client: ${client.name}`,
      metadata: { clientId: client._id, folderName }
    });
  } catch (error: any) {
    console.error('Error in exportClientVaultZip:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// ============================================================================
// 8. EXPORT SINGLE SUB-FOLDER (Direct CSV or Sub-Folder ZIP)
// ============================================================================
export const exportSingleFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId, folderKey } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const client: any = await dynamicDb.Client.findOne({ _id: clientId, tenantId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const safeClientTag = `${sanitizeFileName(client.name)}_${sanitizeFileName(client.mobile || 'client')}`;

    // ------------------------------------------------------------------------
    // FOLDER 1: 01_Basic_Profile -> Single Excel Workbook (.xlsx)
    // ------------------------------------------------------------------------
    if (folderKey === '01_Basic_Profile' || folderKey === 'basic-profile' || folderKey === '01' || folderKey === 'profile') {
      const clientProfile: any = await dynamicDb.ClientProfile.findOne({ clientId: client._id }).lean();
      const profileRows = [
        { key: 'Client ID', value: String(client._id) },
        { key: 'Full Legal Name', value: client.name || 'N/A' },
        { key: 'Mobile Phone', value: String(client.mobile || 'N/A') },
        { key: 'Email Address', value: client.email || 'N/A' },
        { key: 'PAN Card Number', value: client.pan || 'N/A' },
        { key: 'Investor Category', value: client.category || 'INDIVIDUAL' },
        { key: 'Account Status', value: client.status || 'ACTIVE' },
        { key: 'KYC Verification Status', value: client.kycStatus || 'PENDING' },
        { key: 'Agreement Signed Status', value: client.agreementStatus || 'PENDING' },
        { key: 'Registration Timestamp (IST)', value: client.createdAt ? new Date(client.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A' },
        { key: 'Address Line', value: client.addressLine1 || clientProfile?.addressLine1 || 'N/A' },
        { key: 'City', value: client.city || clientProfile?.city || 'N/A' },
        { key: 'State', value: client.state || clientProfile?.state || 'N/A' },
        { key: 'Pin Code', value: String(client.zipCode || clientProfile?.zipCode || 'N/A') },
        { key: 'Occupation', value: clientProfile?.occupation || client.occupation || 'N/A' },
        { key: 'Investment Horizon (Months)', value: String(clientProfile?.investmentPeriod || '12+') },
        { key: 'Assessed Risk Profile', value: clientProfile?.riskProfile || 'MODERATE' },
        { key: 'DigiLocker / KRA Verified', value: (client as any)?.kraVerified ? 'YES' : 'NO' }
      ];

      const excelBuffer = await generateSingleSheetExcel(
        'Client_Profile',
        [
          { header: 'Profile Field / Metric', key: 'key', width: 28 },
          { header: 'Verified Client Detail', key: 'value', width: 45 }
        ],
        profileRows,
        'FF1E3A8A' // Blue
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Client_Profile_${safeClientTag}.xlsx"`);
      return res.status(200).send(excelBuffer);
    }

    // ------------------------------------------------------------------------
    // FOLDER 2: 02_Subscriptions_&_Invoices -> ZIP with Subscriptions Excel + Tax Invoice PDFs
    // ------------------------------------------------------------------------
    if (folderKey === '02_Subscriptions_&_Invoices' || folderKey === 'subscriptions' || folderKey === '02' || folderKey === 'invoices') {
      const [subscriptions, payments] = await Promise.all([
        dynamicDb.Subscription.find({ clientId: client._id }).populate('plan').sort({ createdAt: -1 }).lean(),
        dynamicDb.Payment.find({ clientId: client._id }).sort({ createdAt: -1 }).lean()
      ]);

      const subRows = (subscriptions || []).map((s: any) => {
        const matchingPay = (payments || []).find((p: any) => String(p.planId) === String(s.planId || s.plan?._id));
        const purchaseTime = s.createdAt || matchingPay?.createdAt || s.startDate;
        return {
          planName: s.plan?.name || 'Advisory Plan',
          segment: s.plan?.researchSegments || s.segment || 'N/A',
          purchaseTimestamp: purchaseTime ? new Date(purchaseTime).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
          startDate: s.startDate ? new Date(s.startDate).toISOString().split('T')[0] : '',
          endDate: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
          price: s.amount || s.amountTotal || s.plan?.price || 0,
          paymentMode: (matchingPay as any)?.paymentMode || s.paymentMode || 'Online',
          paymentId: matchingPay?.transactionRef || (matchingPay as any)?.gatewayPaymentId || s.paymentId || 'N/A',
          invoiceNumber: (matchingPay as any)?.invoiceNumber || (matchingPay?._id ? `INV-${String(matchingPay._id).slice(-6).toUpperCase()}` : 'N/A'),
          status: s.status
        };
      });

      const excelBuffer = await generateSingleSheetExcel(
        'Subscriptions_&_Invoices',
        [
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
        ],
        subRows,
        'FF065F46' // Emerald
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="Subscriptions_&_Invoices_${safeClientTag}.zip"`);

      const archive = (typeof (archiver as any) === 'function')
        ? (archiver as any)('zip', { zlib: { level: 9 } })
        : new (archiver as any).ZipArchive({ zlib: { level: 9 } });

      archive.pipe(res);
      archive.append(excelBuffer, { name: `Subscriptions_&_Invoices_Ledger_${safeClientTag}.xlsx` });

      const targetInvoiceIds = new Set<string>();
      for (const p of (payments || [])) targetInvoiceIds.add(String(p._id));
      for (const s of (subscriptions || [])) {
        if ((s as any).paymentId) targetInvoiceIds.add(String((s as any).paymentId));
        else targetInvoiceIds.add(String(s._id));
      }

      for (const id of Array.from(targetInvoiceIds)) {
        try {
          const invoicePdf = await generateInvoicePdf(id);
          if (invoicePdf && invoicePdf.length > 0) {
            archive.append(invoicePdf, { name: `Tax_Invoice_${id}.pdf` });
          }
        } catch (err) {
          console.warn(`Could not append invoice PDF for ${id}:`, err);
        }
      }

      await archive.finalize();
      return;
    }

    // ------------------------------------------------------------------------
    // FOLDER 3: 03_Trade_Signals -> Single Excel Workbook (.xlsx)
    // ------------------------------------------------------------------------
    if (folderKey === '03_Trade_Signals' || folderKey === 'trade-signals' || folderKey === '03' || folderKey === 'signals') {
      const subscriptions: any[] = await dynamicDb.Subscription.find({ clientId: client._id }).lean();
      const planIds = subscriptions.map((s: any) => s.planId).filter(Boolean);
      const signals: any[] = planIds.length > 0
        ? await dynamicDb.Signal.find({ planId: { $in: planIds } }).populate('stockId').sort({ createdAt: -1 }).lean()
        : [];

      const rows = signals.map((s: any) => {
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
          openDate: s.createdAt ? new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
          closeDate: s.closedAt ? new Date(s.closedAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : (s.status === 'ACTIVE' || s.status === 'OPEN' ? 'Open / Active' : '-'),
          symbol: s.stockId?.symbol || s.stockSymbol || 'N/A',
          stockName: s.stockId?.name || s.stockName || 'Stock',
          segment: s.segment || 'EQUITY',
          callType: s.callType || 'BUY',
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

      const excelBuffer = await generateSingleSheetExcel(
        'Trade_Signals',
        [
          { header: 'Open Date & Time (IST)', key: 'openDate', width: 22 },
          { header: 'Close Date & Time (IST)', key: 'closeDate', width: 22 },
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
        ],
        rows,
        'FF4C1D95' // Violet
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Trade_Signals_${safeClientTag}.xlsx"`);
      return res.status(200).send(excelBuffer);
    }

    // ------------------------------------------------------------------------
    // FOLDER 4: 04_Research_Reports -> ZIP with Reports Index Excel + Report PDFs
    // ------------------------------------------------------------------------
    if (folderKey === '04_Research_Reports' || folderKey === 'research-reports' || folderKey === '04' || folderKey === 'reports') {
      const subscriptions: any[] = await dynamicDb.Subscription.find({ clientId: client._id }).lean();
      const planIds = subscriptions.map((s: any) => s.planId).filter(Boolean);
      const signals: any[] = planIds.length > 0
        ? await dynamicDb.Signal.find({ planId: { $in: planIds } }).populate('stockId').sort({ createdAt: -1 }).lean()
        : [];

      const [researchReports, tenant]: any[] = await Promise.all([
        dynamicDb.ResearchReport.find({ tenantId, status: 'PUBLISHED' }).sort({ publishedAt: -1 }).limit(100).lean(),
        dynamicDb.Tenant.findById(tenantId).lean()
      ]);

      const clientStockSymbols: string[] = [];
      const clientStockNames: string[] = [];
      signals.forEach((s: any) => {
        const sym = (s.stockId?.symbol || s.stockSymbol || '').trim();
        const name = (s.stockId?.name || s.stockName || '').trim();
        if (sym && !clientStockSymbols.includes(sym)) {
          clientStockSymbols.push(sym);
          clientStockNames.push(name || sym);
        }
      });

      const clientResearchReports: any[] = [];
      signals.forEach((sig: any) => {
        if (sig.reportUrl) {
          const sym = sig.stockId?.symbol || sig.stockSymbol || 'Trade';
          const name = sig.stockId?.name || sig.stockName || sym;
          clientResearchReports.push({
            _id: sig._id,
            title: `Research Report - ${sym} (${sig.callType || 'Advisory Call'})`,
            stockSymbol: sym,
            stockName: name,
            segment: sig.segment || 'EQUITY',
            type: sig.callType || 'BUY',
            recommendation: sig.callType || 'BUY',
            targetPrice: sig.target1,
            summary: sig.description || `Attached research analysis for ${sym}`,
            publishedAt: sig.createdAt,
            fileUrl: sig.reportUrl,
            isAttachment: true,
            status: 'PUBLISHED'
          });
        }
      });

      if (clientStockSymbols.length > 0) {
        (researchReports || []).forEach((rep: any) => {
          const match = matchReportToClientStocks(rep, clientStockSymbols, clientStockNames);
          if (match.matched) {
            clientResearchReports.push({
              ...rep,
              stockSymbol: match.symbol,
              stockName: match.name,
              fileUrl: null,
              isAttachment: false
            });
          }
        });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="Research_Reports_${safeClientTag}.zip"`);

      const archive = (typeof (archiver as any) === 'function')
        ? (archiver as any)('zip', { zlib: { level: 9 } })
        : new (archiver as any).ZipArchive({ zlib: { level: 9 } });

      archive.pipe(res);

      const reportRows = clientResearchReports.map((r: any) => ({
        title: r.title || 'N/A',
        stockSymbol: r.stockSymbol || 'N/A',
        segment: r.segment || 'EQUITY',
        type: r.type || 'TECHNICAL',
        recommendation: r.recommendation || 'N/A',
        targetPrice: r.targetPrice || 'N/A',
        publishedAt: (r.publishedAt || r.createdAt) ? new Date(r.publishedAt || r.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
        status: r.status || 'PUBLISHED'
      }));

      const excelBuffer = await generateSingleSheetExcel(
        'Research_Reports_Index',
        [
          { header: 'Report Title', key: 'title', width: 30 },
          { header: 'Traded Stock', key: 'stockSymbol', width: 16 },
          { header: 'Market Segment', key: 'segment', width: 18 },
          { header: 'Report Type', key: 'type', width: 16 },
          { header: 'Analyst Recommendation', key: 'recommendation', width: 22 },
          { header: 'Target Valuation', key: 'targetPrice', width: 18 },
          { header: 'Published Date & Time (IST)', key: 'publishedAt', width: 24 },
          { header: 'Status', key: 'status', width: 14 }
        ],
        reportRows,
        'FFD97706' // Amber
      );
      archive.append(excelBuffer, { name: `Research_Reports_Index_${safeClientTag}.xlsx` });

      for (const report of clientResearchReports) {
        try {
          if (report.isAttachment && report.fileUrl) {
            const physical = resolveAttachmentFilePath(report.fileUrl);
            if (physical && fs.existsSync(physical)) {
              const ext = path.extname(report.fileUrl) || '.pdf';
              const safeTitle = sanitizeFileName(report.title || 'Research_Report');
              archive.file(physical, { name: `${safeTitle}${ext}` });
            }
          } else {
            const reportPdf = await generateResearchReportPdf(report, tenant);
            if (reportPdf && reportPdf.length > 0) {
              const safeTitle = sanitizeFileName(report.title || 'Report');
              archive.append(reportPdf, { name: `${safeTitle}_${report._id}.pdf` });
            }
          }
        } catch (err) {
          console.warn('Research report PDF generation failed:', err);
        }
      }

      await archive.finalize();
      return;
    }


    // ------------------------------------------------------------------------
    // FOLDER 5: 05_KYC_Documents -> ZIP with KYC Proof Files + Index Excel
    // ------------------------------------------------------------------------
    if (folderKey === '05_KYC_Documents' || folderKey === 'kyc-documents' || folderKey === '05' || folderKey === 'kyc') {
      const documents: any[] = await dynamicDb.ClientDocument.find({ clientId: client._id }).sort({ uploadedAt: -1 }).lean();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="KYC_Documents_${safeClientTag}.zip"`);

      const archive = (typeof (archiver as any) === 'function')
        ? (archiver as any)('zip', { zlib: { level: 9 } })
        : new (archiver as any).ZipArchive({ zlib: { level: 9 } });

      archive.pipe(res);

      const docRows = (documents || []).map((d: any) => ({
        docType: d.docType || 'IDENTITY_PROOF',
        fileName: d.fileName || 'document.pdf',
        status: d.status || 'VERIFIED',
        uploadedAt: (d.uploadedAt || d.createdAt) ? new Date(d.uploadedAt || d.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A'
      }));

      const excelBuffer = await generateSingleSheetExcel(
        'KYC_Verification_Ledger',
        [
          { header: 'Document Type', key: 'docType', width: 22 },
          { header: 'File Name', key: 'fileName', width: 32 },
          { header: 'Verification Status', key: 'status', width: 20 },
          { header: 'Uploaded Date & Time (IST)', key: 'uploadedAt', width: 24 }
        ],
        docRows,
        'FF0891B2' // Cyan
      );
      archive.append(excelBuffer, { name: `KYC_Verification_Ledger_${safeClientTag}.xlsx` });

      for (const doc of documents || []) {
        if (doc.fileUrl) {
          const physical = resolveAttachmentFilePath(doc.fileUrl);
          if (physical && fs.existsSync(physical)) {
            const ext = path.extname(doc.fileUrl) || path.extname(doc.fileName) || '.pdf';
            const safeName = sanitizeFileName(`${doc.docType}_${doc.fileName.replace(/\.[^/.]+$/, '')}`);
            archive.file(physical, { name: `${safeName}${ext}` });
          }
        }
      }

      await archive.finalize();
      return;
    }

    // ------------------------------------------------------------------------
    // FOLDER 6: 06_Signed_Agreements -> Direct Signed Agreement PDF (or ZIP if multiple)
    // ------------------------------------------------------------------------
    if (folderKey === '06_Signed_Agreements' || folderKey === 'agreements' || folderKey === '06' || folderKey === 'agreement') {
      const agreements: any[] = await dynamicDb.Agreement.find({ clientId: client._id }).sort({ signedAt: -1 }).lean();

      // Check if physical file exists for the primary agreement
      let pdfBuffer: Buffer | null = null;
      if (agreements.length > 0 && agreements[0].agreementUrl) {
        const physical = resolveAttachmentFilePath(agreements[0].agreementUrl);
        if (physical && fs.existsSync(physical)) {
          pdfBuffer = fs.readFileSync(physical);
        }
      }

      // Fallback: Dynamically generate official signed agreement PDF
      if (!pdfBuffer) {
        try {
          pdfBuffer = await generateAgreementPdf(String(client._id), { isSigned: true });
        } catch (err) {
          console.warn('Agreement dynamic PDF generation failed:', err);
        }
      }

      if (pdfBuffer && pdfBuffer.length > 0) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Signed_Agreement_${safeClientTag}.pdf"`);
        return res.status(200).send(pdfBuffer);
      }

      return res.status(404).json({ success: false, message: 'Signed agreement PDF not found for this client.' });
    }

    // ------------------------------------------------------------------------
    // FOLDER 7: 07_Call_Recordings -> ZIP with Audio Recordings (.mp3/.wav) + Index Excel
    // ------------------------------------------------------------------------
    if (folderKey === '07_Call_Recordings' || folderKey === 'recordings' || folderKey === '07' || folderKey === 'calls') {
      const recordings: any[] = await dynamicDb.ClientCallRecording.find({ clientId: client._id, tenantId }).sort({ callDate: -1 }).lean();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="Call_Recordings_${safeClientTag}.zip"`);

      const archive = (typeof (archiver as any) === 'function')
        ? (archiver as any)('zip', { zlib: { level: 9 } })
        : new (archiver as any).ZipArchive({ zlib: { level: 9 } });

      archive.pipe(res);

      const recRows = (recordings || []).map((r: any) => ({
        callType: r.callType,
        callDate: r.callDate ? new Date(r.callDate).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
        duration: formatDuration(r.durationSeconds),
        callerStaff: r.callerStaffName || 'Staff',
        summary: r.summary || '',
        verified: r.isComplianceVerified ? 'YES' : 'NO',
        fileName: r.fileName
      }));

      const excelBuffer = await generateSingleSheetExcel(
        'Call_Recordings_Index',
        [
          { header: 'Call Category', key: 'callType', width: 18 },
          { header: 'Call Date & Time (IST)', key: 'callDate', width: 22 },
          { header: 'Duration (MM:SS)', key: 'duration', width: 16 },
          { header: 'Staff Member', key: 'callerStaff', width: 22 },
          { header: 'Summary / Purpose', key: 'summary', width: 35 },
          { header: 'Compliance Verified', key: 'verified', width: 20 },
          { header: 'Audio File Name', key: 'fileName', width: 30 }
        ],
        recRows,
        'FF881337' // Rose
      );
      archive.append(excelBuffer, { name: `Call_Recordings_Index_${safeClientTag}.xlsx` });

      for (const rec of recordings) {
        if (rec.fileUrl) {
          const physical = resolveAttachmentFilePath(rec.fileUrl);
          if (physical && fs.existsSync(physical)) {
            const ext = path.extname(rec.fileUrl) || '.mp3';
            archive.file(physical, { name: `${sanitizeFileName(rec.fileName || 'recording')}${ext}` });
          }
        }
      }

      await archive.finalize();
      return;
    }

    // ------------------------------------------------------------------------
    // FOLDER 8: 08_Audit_Trail -> Single Excel Workbook (.xlsx)
    // ------------------------------------------------------------------------
    if (folderKey === '08_Audit_Trail' || folderKey === 'audit-trail' || folderKey === '08' || folderKey === 'audit') {
      const activityLogs: any[] = await dynamicDb.ActivityLog.find({ targetClientId: client._id }).sort({ timestamp: -1 }).limit(1000).lean();
      const rows = activityLogs.map((l: any) => ({
        timestamp: (l.timestamp || l.createdAt) ? new Date(l.timestamp || l.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'N/A',
        category: l.category || 'GENERAL',
        action: l.action || 'ACTION',
        title: l.title || 'Event',
        description: l.description || '',
        actor: l.actorName || l.actorType || 'SYSTEM',
        ipAddress: l.ipAddress || 'N/A'
      }));

      const excelBuffer = await generateSingleSheetExcel(
        'Audit_Trail',
        [
          { header: 'Timestamp (IST)', key: 'timestamp', width: 22 },
          { header: 'Category', key: 'category', width: 18 },
          { header: 'Action Event', key: 'action', width: 24 },
          { header: 'Title / Event', key: 'title', width: 28 },
          { header: 'Description', key: 'description', width: 45 },
          { header: 'Actor / User', key: 'actor', width: 20 },
          { header: 'IP Address', key: 'ipAddress', width: 18 }
        ],
        rows,
        'FF334155' // Slate
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Audit_Trail_${safeClientTag}.xlsx"`);
      return res.status(200).send(excelBuffer);
    }

    return res.status(400).json({ success: false, message: `Invalid or unrecognized vault subfolder: ${folderKey}` });
  } catch (error: any) {
    console.error('Error in exportSingleFolder:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// ============================================================================
// 9. DOWNLOAD SINGLE RESEARCH REPORT PDF
// ============================================================================
export const downloadSingleResearchReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { clientId, reportId } = req.params;

    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    if (!clientId || !reportId) return res.status(400).json({ success: false, message: 'Client ID and Report ID required.' });

    const tenant = await dynamicDb.Tenant.findById(tenantId).lean();

    // Check if reportId is a Signal ID with reportUrl
    const signal: any = await dynamicDb.Signal.findOne({ _id: reportId, tenantId }).populate('stockId').lean();
    if (signal?.reportUrl) {
      const physical = resolveAttachmentFilePath(signal.reportUrl);
      if (physical && fs.existsSync(physical)) {
        const sym = signal.stockId?.symbol || signal.stockSymbol || 'Research_Report';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Research_Report_${sanitizeFileName(sym)}.pdf"`);
        return res.sendFile(physical);
      }
    }

    // Check if reportId is a ResearchReport
    const report: any = await dynamicDb.ResearchReport.findOne({ _id: reportId, tenantId }).lean();
    if (report) {
      const pdfBuffer = await generateResearchReportPdf(report, tenant);
      const safeTitle = sanitizeFileName(report.title || 'Research_Report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.status(404).json({ success: false, message: 'Research report not found.' });
  } catch (error: any) {
    console.error('Error in downloadSingleResearchReport:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

