import mongoose from 'mongoose';
import dynamicDb from '../config/db';

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
 * Broadcasts in-app notification to all clients holding an active subscription
 * to the specified plan(s), and also logs an ADMIN notification.
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
      .map((p: any) => p ? (p._id?.toString() || p.id || p.toString()) : null)
      .filter(Boolean);

    if (normalizedPlanIds.length === 0) return;

    const validPlanObjectIds = normalizedPlanIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    // 1. Find all active subscriptions for these plans (supporting both ObjectId & String)
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

    // Filter out expired subscriptions if endDate exists
    const checkDate = signalCreatedAt || new Date();
    const eligibleSubs = subscriptions.filter((sub: any) => {
      if (!sub.endDate) return true;
      return new Date(sub.endDate) >= checkDate;
    });

    const notifiedRecipients = new Set<string>();

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

      // Avoid duplicates if client has multiple subscriptions
      const uniqueKey = clientEmail || recipientId || clientDbId;
      if (!uniqueKey || notifiedRecipients.has(uniqueKey)) continue;
      notifiedRecipients.add(uniqueKey);

      const targetRecipient = clientEmail || recipientId || clientDbId;
      await dynamicDb.NotificationLog.create({
        tenantId: tenantId || sub.tenantId || client.tenantId,
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
          email: clientEmail,
          userId: recipientId
        }
      });
    }

    // 2. Also log an ADMIN notification so admin header and dashboard see the activity
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

    console.log(`[Notification] Broadcasted "${title}" to ${notifiedRecipients.size} active clients and ADMIN.`);
  } catch (err: any) {
    console.error('[Notification] Error broadcasting signal notification:', err);
  }
};
