import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb from '../config/db';
import { testTelegramBot } from '../services/telegramService';
import { checkSmsDlrStatus } from '../services/smsService';
import { AuthenticatedRequest } from '../middlewares/auth';

/**
 * Helper to build common query for delivery reports
 */
function buildReportQuery(tenantId: any, query: any, defaultChannel?: string) {
  const where: any = {};

  if (tenantId) {
    const validTenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
    where.$or = [
      { tenantId: { $in: [tenantId, validTenantObjId].filter(Boolean) } },
      { tenantId: null },
      { tenantId: { $exists: false } }
    ];
  }

  // Filter out pure ADMIN audit logs, keep only client dispatches
  where.recipient = { $ne: 'ADMIN' };

  const channel = (query.channel || defaultChannel || 'ALL').toUpperCase();
  if (channel && channel !== 'ALL') {
    where.channel = channel;
  } else {
    where.channel = { $in: ['INAPP', 'TELEGRAM', 'SMS'] };
  }

  if (query.status && query.status !== 'ALL') {
    const st = query.status.toUpperCase();
    if (st === 'FAILED') {
      where.status = { $in: ['FAILED', 'ERROR'] };
    } else if (st === 'DELIVERED') {
      where.status = { $in: ['DELIVERED', 'SENT'] };
    } else if (st === 'SKIPPED_CLIENT_DISABLED') {
      where.status = { $in: ['SKIPPED_CLIENT_DISABLED', 'SKIPPED'] };
    } else {
      where.status = st;
    }
  }

  // Date Range Filtering
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const eDate = new Date(query.endDate);
      eDate.setHours(23, 59, 59, 999);
      where.createdAt.$lte = eDate;
    }
  }

  // Strictly filter for Trade Signals & Updates only (exclude plan assignments, payment approvals, KYC, welcome)
  where.$and = where.$and || [];
  where.$and.push({
    title: { $nin: ['New Plan Assigned', 'Plan Assigned'] },
    'data.action': { $nin: ['SUBSCRIPTION_ACTIVE', 'PLAN_ASSIGNED', 'PAYMENT', 'KYC'] },
    message: { $not: /Your account has been assigned|payment for .* has been approved/i },
    $or: [
      { 'data.action': { $in: ['NEW_TRADE', 'TRADE_UPDATE'] } },
      { 'data.signalId': { $exists: true, $ne: null } },
      { 'data.stockSymbol': { $exists: true, $ne: null, $nin: ['', 'N/A'] } }
    ]
  });

  // Client-wise Filtering
  if (query.clientId && query.clientId !== 'ALL') {
    const cId = String(query.clientId).trim();
    const isObjId = mongoose.Types.ObjectId.isValid(cId);
    where.$and.push({
      $or: [
        { 'data.clientId': cId },
        { 'data.userId': cId },
        { recipient: cId },
        ...(isObjId ? [{ 'data.clientId': new mongoose.Types.ObjectId(cId) }] : [])
      ]
    });
  }

  // Search Filter
  if (query.search && typeof query.search === 'string' && query.search.trim()) {
    const s = query.search.trim();
    const regex = new RegExp(s, 'i');
    where.$and.push({
      $or: [
        { recipient: { $regex: regex } },
        { title: { $regex: regex } },
        { message: { $regex: regex } },
        { 'data.stockSymbol': { $regex: regex } },
        { 'data.clientName': { $regex: regex } },
        { 'data.email': { $regex: regex } },
        { 'data.mobile': { $regex: regex } },
        { 'data.telegramChatId': { $regex: regex } },
        { 'data.planName': { $regex: regex } }
      ]
    });
  }

  return where;
}

/**
 * Helper to enrich and format notification log records with full subscriber,
 * plan, and trade lifecycle details (Entry vs Exit, levels, profit/loss, sent message).
 */

const maskEmail = (email: string | null | undefined) => {
  if (!email) return email;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
  return `${maskedName}@${parts[1]}`;
};

const maskMobile = (mobile: string | null | undefined) => {
  if (!mobile) return mobile;
  const clean = String(mobile).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last2 = digits.slice(-2);
    const first2 = digits.slice(0, 2);
    return `${first2}${'*'.repeat(digits.length - 4)}${last2}`;
  }
  return clean.length > 4 ? clean.substring(0, 2) + '*'.repeat(clean.length - 4) + clean.substring(clean.length - 2) : '**********';
};

const maskRecipient = (recipient: string | null | undefined) => {
  if (!recipient) return recipient;
  const r = String(recipient).trim();
  if (r.includes('@')) return maskEmail(r);
  if (/^\+?\d{10,14}$/.test(r)) return maskMobile(r);
  return r;
};

async function checkHasViewSensitive(user: any): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
  if (Array.isArray(user.permissions) && user.permissions.includes('VIEW_SENSITIVE_DATA')) return true;
  try {
    const userRole = await dynamicDb.Role.findOne({ name: user.role }).lean();
    if (!userRole) return false;
    const perm = await dynamicDb.Permission.findOne({ code: 'VIEW_SENSITIVE_DATA' }).lean();
    if (!perm) return false;
    const rp = await dynamicDb.RolePermission.findOne({ roleId: userRole._id || userRole.id, permissionId: perm._id || perm.id }).lean();
    return !!rp;
  } catch {
    return false;
  }
}

async function enrichDeliveryRecords(records: any[], hasViewSensitive: boolean = true) {
  if (!records || records.length === 0) return [];

  const clientIdsToFind = new Set<string>();
  const emailsToFind = new Set<string>();
  const signalIdsToFind = new Set<string>();
  const planIdsToFind = new Set<string>();

  records.forEach(r => {
    const d = r.data || {};
    if (d.clientId) clientIdsToFind.add(String(d.clientId));
    if (d.userId) clientIdsToFind.add(String(d.userId));
    if (d.email) emailsToFind.add(String(d.email).toLowerCase());
    if (r.recipient) {
      if (r.recipient.includes('@')) {
        emailsToFind.add(r.recipient.toLowerCase().trim());
      } else if (mongoose.Types.ObjectId.isValid(r.recipient)) {
        clientIdsToFind.add(r.recipient);
      }
    }
    if (d.signalId && mongoose.Types.ObjectId.isValid(d.signalId)) {
      signalIdsToFind.add(String(d.signalId));
    }
    if (d.planId && mongoose.Types.ObjectId.isValid(d.planId)) {
      planIdsToFind.add(String(d.planId));
    }
  });

  const validClientObjIds = Array.from(clientIdsToFind).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  const validSignalObjIds = Array.from(signalIdsToFind).map(id => new mongoose.Types.ObjectId(id));
  const validPlanObjIds = Array.from(planIdsToFind).map(id => new mongoose.Types.ObjectId(id));
  const emailList = Array.from(emailsToFind);

  const [clients, users, signals, plans] = await Promise.all([
    dynamicDb.Client.find({
      $or: [
        ...(validClientObjIds.length > 0 ? [{ _id: { $in: validClientObjIds } }, { userId: { $in: validClientObjIds } }] : []),
        ...(emailList.length > 0 ? [{ email: { $in: emailList } }] : [])
      ]
    }).lean(),
    dynamicDb.User.find({
      $or: [
        ...(validClientObjIds.length > 0 ? [{ _id: { $in: validClientObjIds } }] : []),
        ...(emailList.length > 0 ? [{ email: { $in: emailList } }] : [])
      ]
    }).lean(),
    validSignalObjIds.length > 0 ? dynamicDb.Signal.find({ _id: { $in: validSignalObjIds } }).lean() : [],
    validPlanObjIds.length > 0 ? dynamicDb.Plan.find({ _id: { $in: validPlanObjIds } }).lean() : []
  ]);

  const clientMap = new Map<string, any>();
  clients.forEach((c: any) => {
    if (c._id) clientMap.set(c._id.toString(), c);
    if (c.userId) clientMap.set(c.userId.toString(), c);
    if (c.email) clientMap.set(c.email.toLowerCase().trim(), c);
  });

  const userMap = new Map<string, any>();
  users.forEach((u: any) => {
    if (u._id) userMap.set(u._id.toString(), u);
    if (u.email) userMap.set(u.email.toLowerCase().trim(), u);
  });

  const signalMap = new Map<string, any>();
  signals.forEach((s: any) => {
    if (s._id) signalMap.set(s._id.toString(), s);
  });

  const planMap = new Map<string, any>();
  plans.forEach((p: any) => {
    if (p._id) planMap.set(p._id.toString(), p);
  });

  return records.map(log => {
    const d = log.data || {};
    const recipientStr = (log.recipient || '').trim();
    const recipientLower = recipientStr.toLowerCase();

    const matchedClient = clientMap.get(d.clientId) || clientMap.get(d.userId) || clientMap.get(recipientStr) || clientMap.get(recipientLower);
    const matchedUser = userMap.get(d.userId) || userMap.get(d.clientId) || userMap.get(recipientStr) || userMap.get(recipientLower);
    const matchedSignal = d.signalId ? signalMap.get(String(d.signalId)) : null;
    const matchedPlan = (d.planId ? planMap.get(String(d.planId)) : null) || (matchedSignal?.planId ? planMap.get(String(matchedSignal.planId)) : null);

    const clientName = d.clientName || matchedClient?.name || (matchedUser ? `${matchedUser.firstName || ''} ${matchedUser.lastName || ''}`.trim() : null) || 'Client';
    const clientEmail = d.email || matchedClient?.email || matchedUser?.email || (recipientStr.includes('@') ? recipientStr : null);
    const clientMobile = d.mobile || matchedClient?.mobile || matchedUser?.mobile || (log.channel === 'SMS' && /^\+?\d{10,13}$/.test(recipientStr) ? recipientStr : null);
    const planName = d.planName || matchedPlan?.name || 'Active Plan';
    const telegramChatId = d.telegramChatId || matchedClient?.telegramChatId || null;

    const isExit = d.action === 'TRADE_UPDATE' || log.type === 'update' || !!d.closeStatus || !!d.exitPrice || (matchedSignal && matchedSignal.status === 'CLOSED');
    const tradeAction = isExit ? 'EXIT' : 'ENTRY';

    const rawSched = d.scheduleId || (typeof d.rawResponse === 'string' && /^\d+-\d{4}/.test(d.rawResponse.trim()) ? d.rawResponse.trim() : null);
    const dlrCode = d.dlrCode || d.dlrStatus || (log.channel === 'SMS' && log.status === 'DELIVERED' ? 'DELIVRD' : (log.status === 'FAILED' ? 'FAILED' : null));
    const dlrLabel = d.dlrLabel || (dlrCode === 'DELIVRD' ? 'Delivered' : (dlrCode === 'REJECTD' ? 'Rejected' : (dlrCode === 'EXPIRED' ? 'Expired' : (dlrCode === 'NCPR' ? 'DND (NCPR)' : (dlrCode === 'PENDING' ? 'Pending' : log.status)))));

    return {
      id: log._id?.toString() || log.id,
      channel: log.channel,
      status: log.status,
      title: log.title,
      message: log.message,
      recipient: hasViewSensitive ? log.recipient : maskRecipient(log.recipient),
      stockSymbol: d.stockSymbol || d.symbol || matchedSignal?.symbol || 'N/A',
      segment: d.segment || matchedSignal?.segment || 'CASH',
      callType: d.callType || matchedSignal?.callType || 'BUY',
      tradeAction,
      action: isExit ? 'TRADE_UPDATE' : 'NEW_TRADE',
      entryPrice: d.entryPrice ?? matchedSignal?.entryPrice ?? null,
      target1: d.target1 ?? matchedSignal?.target1 ?? null,
      target2: d.target2 ?? matchedSignal?.target2 ?? null,
      target3: d.target3 ?? matchedSignal?.target3 ?? null,
      stoploss: d.stoploss ?? matchedSignal?.stoploss ?? null,
      exitPrice: d.exitPrice ?? matchedSignal?.exitPrice ?? null,
      closeStatus: d.closeStatus ?? matchedSignal?.closeStatus ?? (isExit ? 'CLOSED' : 'OPEN'),
      closeRemark: d.closeRemark ?? matchedSignal?.closeRemark ?? null,
      clientName,
      clientEmail: hasViewSensitive ? clientEmail : maskEmail(clientEmail),
      clientMobile: hasViewSensitive ? clientMobile : maskMobile(clientMobile),
      telegramChatId,
      planId: d.planId || matchedSignal?.planId || null,
      planName,
      failureReason: d.error || d.reason || (log.status === 'FAILED' ? log.message : null),
      telegramMessageId: d.telegramMessageId || null,
      scheduleId: rawSched,
      dlrCode,
      dlrLabel,
      dlrDescription: d.dlrDescription || null,
      dlrRawResponse: d.dlrRawResponse || (d.rawResponse && d.rawResponse.includes(' ') ? d.rawResponse : null),
      dlrCheckedAt: d.dlrCheckedAt || null,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    };
  });
}

/**
 * GET /api/v1/signals/delivery-reports/master
 * Retrieves combined delivery reports across all channels with KPI summaries.
 */
export const getMasterDeliveryReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where = buildReportQuery(tenantId, req.query);

    const [total, records, summaryStats] = await Promise.all([
      dynamicDb.NotificationLog.countDocuments(where),
      dynamicDb.NotificationLog.find(where)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      // Aggregate stats for all dispatches under current tenant
      dynamicDb.NotificationLog.aggregate([
        {
          $match: {
            recipient: { $ne: 'ADMIN' },
            channel: { $in: ['INAPP', 'TELEGRAM', 'SMS'] },
            title: { $nin: ['New Plan Assigned', 'Plan Assigned'] },
            'data.action': { $nin: ['SUBSCRIPTION_ACTIVE', 'PLAN_ASSIGNED', 'PAYMENT', 'KYC'] },
            message: { $not: /Your account has been assigned|payment for .* has been approved/i },
            $or: [
              { 'data.action': { $in: ['NEW_TRADE', 'TRADE_UPDATE'] } },
              { 'data.signalId': { $exists: true, $ne: null } },
              { 'data.stockSymbol': { $exists: true, $ne: null, $nin: ['', 'N/A'] } }
            ],
            ...(tenantId
              ? {
                  $or: [
                    { tenantId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId },
                    { tenantId: null },
                    { tenantId: { $exists: false } }
                  ]
                }
              : {})
          }
        },
        {
          $group: {
            _id: { channel: '$channel', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Parse summary KPI metrics
    const stats = {
      totalDispatches: 0,
      telegramDelivered: 0,
      telegramFailed: 0,
      smsDelivered: 0,
      smsFailed: 0,
      inAppSent: 0
    };

    summaryStats.forEach((item: any) => {
      const ch = item._id?.channel;
      const st = item._id?.status;
      const count = item.count || 0;
      stats.totalDispatches += count;

      if (ch === 'TELEGRAM') {
        if (st === 'DELIVERED') stats.telegramDelivered += count;
        else if (st === 'FAILED' || st === 'SKIPPED_CLIENT_DISABLED') stats.telegramFailed += count;
      } else if (ch === 'SMS') {
        if (st === 'DELIVERED') stats.smsDelivered += count;
        else if (st === 'FAILED' || st === 'SKIPPED_CLIENT_DISABLED' || st === 'REJECTED' || st === 'EXPIRED' || st === 'UNDELIVERED' || st === 'NCPR_DND') stats.smsFailed += count;
      } else if (ch === 'INAPP') {
        stats.inAppSent += count;
      }
    });

    const hasViewSensitive = await checkHasViewSensitive(req.user);
    const enrichedData = await enrichDeliveryRecords(records, hasViewSensitive);

    return res.status(200).json({
      success: true,
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error: any) {
    console.error('Error fetching master delivery report:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch delivery report' });
  }
};

/**
 * GET /api/v1/signals/delivery-reports/channel/:channel
 * Specific channel report (TELEGRAM, SMS, INAPP)
 */
export const getChannelDeliveryReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const channelParam = (req.params.channel || '').toUpperCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where = buildReportQuery(tenantId, req.query, channelParam);

    const [total, records] = await Promise.all([
      dynamicDb.NotificationLog.countDocuments(where),
      dynamicDb.NotificationLog.find(where)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const hasViewSensitive = await checkHasViewSensitive(req.user);
    const enrichedData = await enrichDeliveryRecords(records, hasViewSensitive);

    return res.status(200).json({
      success: true,
      channel: channelParam,
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error(`Error fetching ${req.params.channel} delivery report:`, error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch report' });
  }
};

/**
 * POST /api/v1/admin/telegram/test
 * Tests the Telegram Bot Token against Telegram API.
 */
export const testTelegramBotConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    let botToken = req.body?.botToken;

    if (!botToken && tenantId) {
      const tenantDoc: any = await dynamicDb.Tenant.findById(tenantId).lean();
      botToken = tenantDoc?.telegramBotToken;
    }

    if (!botToken || typeof botToken !== 'string' || !botToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Telegram Bot Token is required to perform connection test.'
      });
    }

    const testResult = await testTelegramBot(botToken.trim());

    if (testResult.success && testResult.bot) {
      return res.status(200).json({
        success: true,
        message: `Successfully connected to Telegram Bot: @${testResult.bot.username} (${testResult.bot.firstName})`,
        bot: testResult.bot
      });
    }

    return res.status(400).json({
      success: false,
      message: testResult.error || 'Failed to authenticate with Telegram Bot API.'
    });
  } catch (error: any) {
    console.error('Error testing Telegram bot connection:', error);
    return res.status(500).json({ success: false, message: error.message || 'Test connection error' });
  }
};

/**
 * POST /api/v1/signals/delivery-reports/sync-dlr
 * Synchronizes real-time delivery reports from Pinnacle / SMSJust gateway
 * using /sms/user/response.php?Scheduleid=XXXXX according to Pinnacle eZeeSMS documentation.
 */
export const syncSmsDeliveryReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { logId } = req.body || {};

    const query: any = { channel: 'SMS' };
    if (tenantId) {
      const validTenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
      query.$or = [
        { tenantId: { $in: [tenantId, validTenantObjId].filter(Boolean) } },
        { tenantId: null },
        { tenantId: { $exists: false } }
      ];
    }

    if (logId) {
      query._id = logId;
    } else {
      query.$and = [
        {
          $or: [
            { 'data.scheduleId': { $exists: true, $ne: null } },
            { 'data.rawResponse': { $regex: /^\d+-\d{4}/ } }
          ]
        }
      ];
    }

    const logs = await dynamicDb.NotificationLog.find(query)
      .sort({ createdAt: -1 })
      .limit(logId ? 1 : 100);

    let updatedCount = 0;
    const results: any[] = [];

    for (const log of logs) {
      const d = log.data || {};
      const schedId = d.scheduleId || (typeof d.rawResponse === 'string' && /^\d+-\d{4}/.test(d.rawResponse.trim()) ? d.rawResponse.trim() : null);
      if (!schedId) continue;

      const dlr = await checkSmsDlrStatus(schedId, log.tenantId?.toString() || tenantId);
      if (dlr) {
        log.status = dlr.status;
        log.data = {
          ...d,
          scheduleId: schedId,
          dlrStatus: dlr.dlrCode,
          dlrCode: dlr.dlrCode,
          dlrLabel: dlr.label,
          dlrDescription: dlr.description,
          dlrRawResponse: dlr.rawResponse,
          dlrCheckedAt: new Date(),
          failureReason: dlr.status !== 'DELIVERED' ? dlr.description : null,
          error: dlr.status !== 'DELIVERED' ? dlr.description : null
        };
        await log.save();
        updatedCount++;
        results.push({
          id: log._id.toString(),
          scheduleId: schedId,
          status: dlr.status,
          dlrCode: dlr.dlrCode,
          label: dlr.label,
          description: dlr.description
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synchronized ${updatedCount} SMS delivery report(s) from Pinnacle gateway`,
      updatedCount,
      data: results
    });
  } catch (error: any) {
    console.error('Error syncing SMS delivery reports:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to sync delivery reports' });
  }
};

