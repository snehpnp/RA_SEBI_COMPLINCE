import mongoose from 'mongoose';
import dynamicDb from '../config/db';
import { sendSms } from './smsService';
import { sendTelegramMessage, formatTradeTelegramMessage } from './telegramService';

export interface BroadcastNotificationOptions {
  tenantId: any;
  planIds: string[] | any[];
  title: string;
  message: string;
  type?: 'signal' | 'alert' | 'report' | 'update';
  data?: any;
  createdById?: any;
  adminTitle?: string;
  adminMessage?: string;
  signalCreatedAt?: Date;
}

/**
 * Broadcasts trade notifications across:
 * 1. In-App / Client Panel
 * 2. Direct Telegram Bot DM (if enabled in Tenant Settings & Client Profile)
 * 3. Direct SMS (if enabled in Tenant Settings & Client Profile)
 *
 * STRICT SUBSCRIPTION ENFORCEMENT:
 * - Client MUST hold an ACTIVE subscription for the specified plan(s).
 * - Expired subscriptions (endDate < now) NEVER receive trades.
 */
export const broadcastSignalNotification = async (options: BroadcastNotificationOptions) => {
  const {
    tenantId,
    planIds,
    title,
    message,
    type = 'signal',
    data = {},
    adminTitle,
    adminMessage,
    signalCreatedAt
  } = options;

  try {
    if (!planIds || (Array.isArray(planIds) && planIds.length === 0)) return;

    // Normalize planIds to array
    const normalizedPlanIds = (Array.isArray(planIds) ? planIds : [planIds])
      .map((p: any) => (p ? (p._id?.toString() || p.id || p.toString()) : null))
      .filter(Boolean);

    if (normalizedPlanIds.length === 0) return;

    const validPlanObjectIds = normalizedPlanIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    // Fetch tenant configuration for Telegram & SMS flags
    let tenantDoc: any = null;
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      tenantDoc = await dynamicDb.Tenant.findById(tenantId).lean();
    }
    if (!tenantDoc && tenantId) {
      tenantDoc = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId }] }).lean();
    }
    if (!tenantDoc) {
      tenantDoc = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
    }

    // Fetch primary plan name for notification formatting
    let planName = 'Active Plan';
    try {
      const pDoc = await dynamicDb.Plan.findOne({
        _id: { $in: [...validPlanObjectIds, ...normalizedPlanIds] }
      }).lean();
      if (pDoc?.name) planName = pDoc.name;
    } catch {}

    // 1. Find all active subscriptions for these plans
    const subQuery: any = {
      planId: { $in: [...validPlanObjectIds, ...normalizedPlanIds] },
      status: { $in: ['ACTIVE', 'active'] }
    };

    if (tenantId) {
      const validTenantObjId = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
      subQuery.$or = [
        { tenantId: { $in: [tenantId, validTenantObjId].filter(Boolean) } },
        { tenantId: null },
        { tenantId: { $exists: false } }
      ];
    }

    if (signalCreatedAt) {
      subQuery.startDate = { $lte: signalCreatedAt };
    }

    const subscriptions = await dynamicDb.Subscription.find(subQuery)
      .populate({
        path: 'clientId',
        populate: { path: 'userId', select: '_id id email firstName lastName' }
      })
      .lean();

    // STRICT EXPIRY FILTER: Filter out expired subscriptions if endDate exists
    const checkDate = signalCreatedAt || new Date();
    const eligibleSubs = subscriptions.filter((sub: any) => {
      if (!sub.endDate) return true;
      return new Date(sub.endDate) >= checkDate;
    });

    const notifiedRecipients = new Set<string>();

    const isTenantTelegramEnabled = Boolean(tenantDoc?.telegramTradeEnabled);
    const botToken = tenantDoc?.telegramBotToken;
    const isTenantSmsEnabled = Boolean(tenantDoc?.smsTradeEnabled && tenantDoc?.smsGatewayEnabled);

    for (const sub of (eligibleSubs as any[])) {
      let client = (sub.clientId || sub.client) as any;
      // If population was incomplete, fetch client directly
      if (!client || typeof client !== 'object' || (!client.email && !client.userId)) {
        const rawClientId = sub.clientId?._id || sub.clientId;
        if (rawClientId) {
          client = await dynamicDb.Client.findById(rawClientId).populate('userId').lean();
        }
      }
      if (!client) continue;

      let user = (client.userId || client.user) as any;
      if (user && typeof user !== 'object') {
        user = await dynamicDb.User.findById(user).lean();
      }

      const recipientId = user?._id?.toString() || user?.id || client.userId?.toString();
      const clientEmail = client.email || user?.email;
      const clientDbId = client._id?.toString() || client.id;
      const clientName = client.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Client';
      const destMobile = client.mobile || user?.mobile;

      // Avoid duplicate processing if client has multiple concurrent subscriptions
      const uniqueKey = clientEmail || recipientId || clientDbId;
      if (!uniqueKey || notifiedRecipients.has(uniqueKey)) continue;
      notifiedRecipients.add(uniqueKey);

      const targetRecipient = clientEmail || recipientId || clientDbId;
      const currentTenantId = tenantId || sub.tenantId || client.tenantId;

      // ==========================================
      // 1. IN-APP / PANEL NOTIFICATION
      // ==========================================
      await dynamicDb.NotificationLog.create({
        tenantId: currentTenantId,
        recipient: targetRecipient,
        channel: 'INAPP',
        title,
        message,
        type,
        isRead: false,
        status: 'SENT',
        data: {
          ...data,
          clientId: clientDbId,
          clientName,
          email: clientEmail,
          mobile: destMobile,
          userId: recipientId,
          planId: sub.planId,
          planName
        }
      });

      // ==========================================
      // 2. TELEGRAM BOT DIRECT 1-on-1 DISPATCH
      // ==========================================
      if (isTenantTelegramEnabled) {
        const isClientTelegramEnabled = client.isTelegramTradeEnabled !== false;
        const telegramChatId = client.telegramChatId;

        if (!isClientTelegramEnabled) {
          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: targetRecipient,
            channel: 'TELEGRAM',
            title,
            message: 'Telegram trade dispatch is disabled for this client',
            type,
            isRead: false,
            status: 'SKIPPED_CLIENT_DISABLED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              email: clientEmail,
              mobile: destMobile,
              telegramChatId,
              planId: sub.planId,
              planName,
              reason: 'Disabled in client profile'
            }
          });
        } else if (!telegramChatId) {
          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: targetRecipient,
            channel: 'TELEGRAM',
            title,
            message: 'Telegram Chat ID not linked in client profile',
            type,
            isRead: false,
            status: 'FAILED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              email: clientEmail,
              mobile: destMobile,
              telegramChatId: null,
              planId: sub.planId,
              planName,
              reason: 'Telegram Chat ID missing'
            }
          });
        } else if (!botToken) {
          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: targetRecipient,
            channel: 'TELEGRAM',
            title,
            message: 'Telegram Bot Token is not configured in Admin Settings',
            type,
            isRead: false,
            status: 'FAILED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              email: clientEmail,
              mobile: destMobile,
              telegramChatId,
              planId: sub.planId,
              planName,
              reason: 'Bot Token missing in Settings'
            }
          });
        } else {
          // Send 1-on-1 trade recommendation via Bot
          const formattedTgMessage = formatTradeTelegramMessage(data, {
            companyName: tenantDoc?.companyName,
            sebiRegistration: tenantDoc?.sebiRegistration,
            isUpdate: type === 'update' || data?.action === 'TRADE_UPDATE',
            updateStatus: data?.closeStatus,
            planName
          });

          const tgRes = await sendTelegramMessage({
            botToken,
            chatId: telegramChatId,
            text: formattedTgMessage
          });

          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: targetRecipient,
            channel: 'TELEGRAM',
            title,
            message: formattedTgMessage,
            type,
            isRead: false,
            status: tgRes.success ? 'DELIVERED' : 'FAILED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              email: clientEmail,
              mobile: destMobile,
              telegramChatId,
              planId: sub.planId,
              planName,
              telegramMessageId: tgRes.messageId,
              error: tgRes.error
            }
          });
        }
      }

      // ==========================================
      // 3. SMS DISPATCH
      // ==========================================
      if (isTenantSmsEnabled) {
        const isClientSmsEnabled = client.isSmsTradeEnabled !== false;

        if (!isClientSmsEnabled) {
          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: destMobile || targetRecipient,
            channel: 'SMS',
            title,
            message: 'SMS trade dispatch is disabled for this client',
            type,
            isRead: false,
            status: 'SKIPPED_CLIENT_DISABLED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              mobile: destMobile,
              planId: sub.planId,
              planName,
              reason: 'Disabled in client profile'
            }
          });
        } else if (!destMobile) {
          await dynamicDb.NotificationLog.create({
            tenantId: currentTenantId,
            recipient: 'NO_MOBILE',
            channel: 'SMS',
            title,
            message: 'Client mobile number missing',
            type,
            isRead: false,
            status: 'FAILED',
            data: {
              ...data,
              clientId: clientDbId,
              clientName,
              mobile: null,
              planId: sub.planId,
              planName,
              reason: 'Mobile number missing'
            }
          });
        } else {
          try {
            const tradeSegment = data?.segment ? String(data.segment).trim().toUpperCase() : '';

            let tradeAction = '';
            if (type === 'signal' || data?.action === 'NEW_TRADE') {
              tradeAction = (data?.callType || 'BUY').trim().toUpperCase();
            } else if (type === 'update' || data?.action === 'TRADE_UPDATE') {
              const cStatus = (data?.closeStatus || '').toUpperCase();
              if (cStatus.includes('SL') || cStatus.includes('STOPLOSS')) {
                tradeAction = 'STOPLOSS';
              } else {
                tradeAction = 'TARGET';
              }
            }

            if (tradeSegment && tradeAction) {
              const smsResult = await sendSms({
                tenantId: currentTenantId,
                mobile: destMobile,
                templateType: 'TRADE_SIGNAL',
                segment: tradeSegment,
                action: tradeAction,
                variables: {
                  stock: data?.stockSymbol || '',
                  symbol: data?.stockSymbol || '',
                  action: tradeAction,
                  segment: tradeSegment,
                  price: data?.entryPrice || data?.exitPrice || '',
                  entry: data?.entryPrice || '',
                  exit: data?.exitPrice || '',
                  target: data?.target1 || '',
                  stoploss: data?.stoploss || '',
                  sl: data?.stoploss || ''
                },
                orderedVariables: [
                  data?.stockSymbol || '',
                  data?.entryPrice || data?.exitPrice || '',
                  data?.target1 || '',
                  data?.stoploss || ''
                ]
              });

              await dynamicDb.NotificationLog.create({
                tenantId: currentTenantId,
                recipient: destMobile,
                channel: 'SMS',
                title,
                message: smsResult.message || `SMS dispatched for ${data?.stockSymbol}`,
                type,
                isRead: false,
                status: smsResult.success ? 'DELIVERED' : 'FAILED',
                data: {
                  ...data,
                  clientId: clientDbId,
                  clientName,
                  mobile: destMobile,
                  planId: sub.planId,
                  planName,
                  rawResponse: smsResult.rawResponse,
                  error: smsResult.success ? null : (smsResult.message || smsResult.reason)
                }
              });
            }
          } catch (smsCatchErr: any) {
            console.warn('[Notification Service] SMS send attempt error:', smsCatchErr?.message);
            await dynamicDb.NotificationLog.create({
              tenantId: currentTenantId,
              recipient: destMobile,
              channel: 'SMS',
              title,
              message: 'SMS dispatch failed',
              type,
              isRead: false,
              status: 'FAILED',
              data: {
                ...data,
                clientId: clientDbId,
                clientName,
                mobile: destMobile,
                planId: sub.planId,
                planName,
                error: smsCatchErr?.message
              }
            });
          }
        }
      }
    }

    // 4. Log an ADMIN notification so admin header and dashboard see the activity
    const finalAdminTitle = adminTitle || title;
    const finalAdminMessage = adminMessage || message;

    await dynamicDb.NotificationLog.create({
      tenantId,
      recipient: 'ADMIN',
      channel: 'ADMIN',
      title: finalAdminTitle,
      message: finalAdminMessage,
      type,
      isRead: false,
      status: 'SENT',
      data: {
        ...data,
        targetAudience: 'ADMIN',
        notifiedClientCount: notifiedRecipients.size
      }
    });

    console.log(
      `[Notification] Broadcasted "${title}" to ${notifiedRecipients.size} active clients (Channels: INAPP${
        isTenantTelegramEnabled ? ', TELEGRAM' : ''
      }${isTenantSmsEnabled ? ', SMS' : ''}).`
    );
  } catch (err: any) {
    console.error('[Notification] Error broadcasting signal notification:', err);
  }
};
