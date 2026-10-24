import mongoose from 'mongoose';
import dynamicDb from '../config/db';
import { sendSms, checkSmsDlrStatus } from './smsService';
import { sendTelegramMessage, formatTradeTelegramMessage } from './telegramService';

export interface BroadcastNotificationOptions {
  tenantId: any;
  planIds?: string[] | any[];
  categoryIds?: string[] | any[];
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
    categoryIds,
    title,
    message,
    type = 'signal',
    data = {},
    adminTitle,
    adminMessage,
    signalCreatedAt
  } = options;

  try {
    const hasPlans = planIds && (!Array.isArray(planIds) || planIds.length > 0);
    const hasCategories = categoryIds && (!Array.isArray(categoryIds) || categoryIds.length > 0);
    if (!hasPlans && !hasCategories) return;

    // Collect all category IDs from categoryIds and planIds
    let allCatIds: string[] = [];
    if (categoryIds) {
      const arr = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
      allCatIds.push(...arr.map((c: any) => (c ? (c._id?.toString() || c.id || c.toString()) : null)).filter(Boolean));
    }

    const rawPlanIds = (Array.isArray(planIds) ? planIds : (planIds ? [planIds] : []))
      .map((p: any) => (p ? (p._id?.toString() || p.id || p.toString()) : null))
      .filter(Boolean);



    // If any ID in planIds is actually a PlanCategory, detect and treat it as category
    if (rawPlanIds.length > 0) {
      const potentialCategoryObjectIds = rawPlanIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      const matchedCats = await dynamicDb.PlanCategory.find({
        $or: [
          { _id: { $in: potentialCategoryObjectIds } },
          { id: { $in: rawPlanIds } }
        ]
      }).select('_id id').lean();
      if (matchedCats && matchedCats.length > 0) {
        allCatIds.push(...matchedCats.map((c: any) => c._id?.toString() || c.id?.toString()));
      }
    }

    // Now resolve all Plans under these categories
    let allPlanIds: string[] = [...rawPlanIds];
    if (allCatIds.length > 0) {
      const validCatObjectIds = allCatIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
      const plansInCategories = await dynamicDb.Plan.find({
        $or: [
          { categoryId: { $in: validCatObjectIds } },
          { categoryId: { $in: allCatIds } }
        ]
      }).select('_id id').lean();

      plansInCategories.forEach((p: any) => {
        allPlanIds.push(p._id?.toString());
        if (p.id) allPlanIds.push(p.id.toString());
      });
    }

    // Normalize planIds to unique array
    const normalizedPlanIds = [...new Set(allPlanIds.filter(Boolean))] as string[];




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

    const now = new Date();
    subQuery.startDate = { $lte: now };

    const subscriptions = await dynamicDb.Subscription.find(subQuery)
      .populate({
        path: 'clientId',
        populate: { path: 'userId', select: '_id id email firstName lastName' }
      })
      .lean();

    // STRICT EXPIRY FILTER: Filter out expired subscriptions if endDate exists
    // Ensures subscription remains active throughout the entire end date (inclusive up to 23:59:59.999)
    const eligibleSubs = subscriptions.filter((sub: any) => {
      if (!sub.endDate) return true;
      const end = new Date(sub.endDate);
      if (isNaN(end.getTime())) return true;
      const endOfDayUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
      const endOfDayLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
      const effectiveEnd = Math.max(end.getTime(), endOfDayUtc.getTime(), endOfDayLocal.getTime());
      return effectiveEnd >= now.getTime();
    });

    const notifiedRecipients = new Set<string>();

    const isTenantTelegramEnabled = Boolean(tenantDoc?.telegramTradeEnabled);
    const botToken = tenantDoc?.telegramBotToken;
    const isTenantSmsEnabled = Boolean(tenantDoc?.smsGatewayEnabled && tenantDoc?.smsTradeEnabled !== false);

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
            isAlert: type === 'alert' || data?.action === 'TRADE_ALERT',
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
      } else {
        await dynamicDb.NotificationLog.create({
          tenantId: currentTenantId,
          recipient: targetRecipient,
          channel: 'TELEGRAM',
          title,
          message: 'Telegram Trade is disabled in Admin Settings',
          type,
          isRead: false,
          status: 'SKIPPED',
          data: {
            ...data,
            clientId: clientDbId,
            clientName,
            email: clientEmail,
            mobile: destMobile,
            telegramChatId: client.telegramChatId || null,
            planId: sub.planId,
            planName,
            reason: 'Telegram Trade is disabled in Admin Settings'
          }
        });
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
            const isTradeAlert = type === 'alert' || data?.action === 'TRADE_ALERT';
            const tradeSegment = data?.segment ? String(data.segment).trim().toUpperCase() : '';

            let tradeAction = '';
            if (isTradeAlert) {
              tradeAction = 'ALERT';
            } else if (type === 'signal' || data?.action === 'NEW_TRADE') {
              tradeAction = (data?.callType || 'BUY').trim().toUpperCase();
            } else if (type === 'update' || data?.action === 'TRADE_UPDATE') {
              const cStatus = (data?.closeStatus || '').toUpperCase();
              if (cStatus.includes('SL') || cStatus.includes('STOPLOSS')) {
                tradeAction = 'STOPLOSS';
              } else if (cStatus.includes('AVOID')) {
                tradeAction = 'AVOID';
              } else if (cStatus.includes('FULLY') || cStatus.includes('CLOSED')) {
                tradeAction = 'CLOSE';
              } else {
                tradeAction = 'TARGET';
              }
            }

            if ((tradeSegment && tradeAction) || isTradeAlert) {
              let futMonth = '';
              if (data?.expiryDate) {
                try {
                  const d = new Date(data.expiryDate);
                  if (!isNaN(d.getTime())) {
                    futMonth = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                  }
                } catch (e) {}
              }

              let fullInstrument = data?.stockSymbol || '';
              if (tradeSegment === 'OPTION') {
                fullInstrument = [data?.stockSymbol, data?.strikePrice, data?.optionType].filter(Boolean).join(' ');
              } else if (tradeSegment === 'FUTURE') {
                fullInstrument = [data?.stockSymbol, futMonth, 'FUT'].filter(Boolean).join(' ');
              }

              const targetsJoined = [data?.target1, data?.target2, data?.target3]
                .filter((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
                .join('/');

              const isTradeUpdate = type === 'update' || data?.action === 'TRADE_UPDATE';
              const singleTargetVal = data?.closedTargetVal || (data?.specificTargetPrice ? String(data.specificTargetPrice) : '') || (isTradeUpdate && data?.exitPrice ? String(data.exitPrice) : '');
              const targetValToUse = isTradeUpdate && singleTargetVal ? singleTargetVal : targetsJoined;
              const alertMsg = data?.alertMessage || data?.message || message || '';

              const smsResult = await sendSms({
                tenantId: currentTenantId,
                mobile: destMobile,
                templateType: isTradeAlert ? 'TRADE_ALERT' : 'TRADE_SIGNAL',
                segment: tradeSegment,
                action: tradeAction,
                variables: {
                  stock: data?.stockSymbol || '',
                  symbol: data?.stockSymbol || '',
                  fullInstrument,
                  alertMessage: alertMsg,
                  alert: alertMsg,
                  message: alertMsg,
                  planName: planName || '',
                  plan: planName || '',
                  action: isTradeAlert ? 'ALERT' : (isTradeUpdate ? (data?.targetLabel ? `${data.targetLabel} ACHIEVED` : (data?.closeStatus || tradeAction)) : tradeAction),
                  callType: isTradeAlert ? 'ALERT' : (isTradeUpdate ? (data?.targetLabel ? `${data.targetLabel} ACHIEVED` : (data?.closeStatus || tradeAction)) : tradeAction),
                  segment: tradeSegment,
                  price: data?.exitPrice || data?.entryPrice || '',
                  entryPrice: data?.entryPrice || '',
                  entry: data?.entryPrice || '',
                  exit: data?.exitPrice || singleTargetVal || '',
                  exitPrice: data?.exitPrice || singleTargetVal || '',
                  targets: targetValToUse,
                  target: targetValToUse,
                  targetLabel: data?.targetLabel || '',
                  target1: singleTargetVal || (data?.target1 || ''),
                  target2: singleTargetVal || (data?.target2 || ''),
                  target3: singleTargetVal || (data?.target3 || ''),
                  stoploss: data?.stoploss || '',
                  sl: data?.stoploss || '',
                  closeStatus: data?.closeStatus || tradeAction,
                  closeRemark: data?.closeRemark || '',
                  duration: data?.tradeDuration || '',
                  tradeDuration: data?.tradeDuration || '',
                  instrumentWithPrice: `${fullInstrument} @ ${data?.exitPrice || data?.entryPrice || ''}`.trim()
                },
                orderedVariables: Array.isArray(data?.smsOrderedVariables) && data.smsOrderedVariables.length > 0
                  ? data.smsOrderedVariables
                  : undefined
              });

              const scheduleId = (smsResult.rawResponse || '').trim();
              const isSchedId = /^\d+-\d{4}/.test(scheduleId);

              const createdLog = await dynamicDb.NotificationLog.create({
                tenantId: currentTenantId,
                recipient: destMobile,
                channel: 'SMS',
                title,
                message: smsResult.sentMessage || smsResult.message || `SMS dispatched for ${data?.stockSymbol}`,
                type,
                isRead: false,
                status: smsResult.success ? (isSchedId ? 'PENDING' : 'DELIVERED') : 'FAILED',
                data: {
                  ...data,
                  clientId: clientDbId,
                  clientName,
                  mobile: destMobile,
                  planId: sub.planId,
                  planName,
                  scheduleId: isSchedId ? scheduleId : undefined,
                  rawResponse: smsResult.rawResponse,
                  error: smsResult.success ? null : (smsResult.message || smsResult.reason),
                  reason: smsResult.success ? null : (smsResult.message || smsResult.reason)
                }
              });

              // Background DLR verification after 3.5s per Pinnacle DLR API documentation
              if (smsResult.success && isSchedId && createdLog?._id) {
                setTimeout(async () => {
                  try {
                    const dlr = await checkSmsDlrStatus(scheduleId, currentTenantId);
                    if (dlr && dlr.status) {
                      await dynamicDb.NotificationLog.updateOne(
                        { _id: createdLog._id },
                        {
                          $set: {
                            status: dlr.status,
                            'data.dlrStatus': dlr.dlrCode,
                            'data.dlrCode': dlr.dlrCode,
                            'data.dlrLabel': dlr.label,
                            'data.dlrDescription': dlr.description,
                            'data.dlrRawResponse': dlr.rawResponse,
                            'data.dlrCheckedAt': new Date()
                          }
                        }
                      );
                    }
                  } catch (e) {
                    // background check catch
                  }
                }, 3500);
              }
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
                error: smsCatchErr?.message,
                reason: smsCatchErr?.message || 'SMS dispatch error'
              }
            });
          }
        }
      } else {
        await dynamicDb.NotificationLog.create({
          tenantId: currentTenantId,
          recipient: destMobile || targetRecipient,
          channel: 'SMS',
          title,
          message: 'SMS Gateway or SMS Trade is disabled in Admin Settings',
          type,
          isRead: false,
          status: 'SKIPPED',
          data: {
            ...data,
            clientId: clientDbId,
            clientName,
            mobile: destMobile,
            planId: sub.planId,
            planName,
            reason: 'SMS Gateway or SMS Trade is disabled in Admin Settings'
          }
        });
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
