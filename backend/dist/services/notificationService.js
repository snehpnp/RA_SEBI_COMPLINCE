"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastSignalNotification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("../config/db"));
/**
 * Broadcasts in-app notification to all clients holding an active subscription
 * to the specified plan(s), and also logs an ADMIN notification.
 */
const broadcastSignalNotification = async (options) => {
    const { tenantId, planIds, title, message, type = 'signal', data = {}, adminTitle, adminMessage, signalCreatedAt } = options;
    try {
        if (!planIds || (Array.isArray(planIds) && planIds.length === 0))
            return;
        // Normalize planIds to array
        const normalizedPlanIds = (Array.isArray(planIds) ? planIds : [planIds])
            .map((p) => p ? (p._id?.toString() || p.id || p.toString()) : null)
            .filter(Boolean);
        if (normalizedPlanIds.length === 0)
            return;
        const validPlanObjectIds = normalizedPlanIds
            .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
            .map((id) => new mongoose_1.default.Types.ObjectId(id));
        // 1. Find all active subscriptions for these plans (supporting both ObjectId & String)
        const subQuery = {
            planId: { $in: [...validPlanObjectIds, ...normalizedPlanIds] },
            status: { $in: ['ACTIVE', 'active'] }
        };
        if (tenantId) {
            const validTenantObjId = mongoose_1.default.Types.ObjectId.isValid(tenantId) ? new mongoose_1.default.Types.ObjectId(tenantId) : null;
            subQuery.$or = [
                { tenantId: { $in: [tenantId, validTenantObjId].filter(Boolean) } },
                { tenantId: null },
                { tenantId: { $exists: false } }
            ];
        }
        if (signalCreatedAt) {
            subQuery.startDate = { $lte: signalCreatedAt };
        }
        const subscriptions = await db_1.default.Subscription.find(subQuery)
            .populate({
            path: 'clientId',
            populate: { path: 'userId', select: '_id id email firstName lastName' }
        })
            .lean();
        // Filter out expired subscriptions if endDate exists
        const checkDate = signalCreatedAt || new Date();
        const eligibleSubs = subscriptions.filter((sub) => {
            if (!sub.endDate)
                return true;
            return new Date(sub.endDate) >= checkDate;
        });
        const notifiedRecipients = new Set();
        for (const sub of eligibleSubs) {
            let client = (sub.clientId || sub.client);
            // If population was incomplete, fetch client directly
            if (!client || typeof client !== 'object' || (!client.email && !client.userId)) {
                const rawClientId = sub.clientId?._id || sub.clientId;
                if (rawClientId) {
                    client = await db_1.default.Client.findById(rawClientId).populate('userId').lean();
                }
            }
            if (!client)
                continue;
            let user = (client.userId || client.user);
            if (user && typeof user !== 'object') {
                user = await db_1.default.User.findById(user).lean();
            }
            const recipientId = user?._id?.toString() || user?.id || client.userId?.toString();
            const clientEmail = client.email || user?.email;
            const clientDbId = client._id?.toString() || client.id;
            // Avoid duplicates if client has multiple subscriptions
            const uniqueKey = clientEmail || recipientId || clientDbId;
            if (!uniqueKey || notifiedRecipients.has(uniqueKey))
                continue;
            notifiedRecipients.add(uniqueKey);
            const targetRecipient = clientEmail || recipientId || clientDbId;
            await db_1.default.NotificationLog.create({
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
        await db_1.default.NotificationLog.create({
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
    }
    catch (err) {
        console.error('[Notification] Error broadcasting signal notification:', err);
    }
};
exports.broadcastSignalNotification = broadcastSignalNotification;
