"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationsAsRead = exports.getNotifications = exports.updateProfile = exports.getPaymentHistory = exports.getSubscriptions = void 0;
const db_1 = __importDefault(require("../config/db"));
const auditService_1 = require("../services/auditService");
// Fetch client subscriptions
const getSubscriptions = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    try {
        let client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client) {
            client = await db_1.default.Client.findById(userId).lean();
        }
        const clientId = client ? (client._id || client.id) : userId;
        const subscriptions = await db_1.default.Subscription.find({
            $or: [
                { clientId },
                { clientId: userId }
            ]
        })
            .populate('planId')
            .sort({ createdAt: -1 })
            .lean();
        const formatted = await Promise.all(subscriptions.map(async (s) => {
            let planObj = s.planId;
            if (planObj && typeof planObj === 'object' && (planObj.name || planObj.title)) {
                return {
                    ...s,
                    id: String(s._id || s.id),
                    plan: {
                        ...planObj,
                        id: String(planObj._id || planObj.id)
                    }
                };
            }
            else if (planObj) {
                const foundPlan = await db_1.default.Plan.findById(planObj).lean();
                return {
                    ...s,
                    id: String(s._id || s.id),
                    plan: foundPlan ? {
                        ...foundPlan,
                        id: String(foundPlan._id || foundPlan.id)
                    } : null
                };
            }
            return {
                ...s,
                id: String(s._id || s.id),
                plan: null
            };
        }));
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getSubscriptions = getSubscriptions;
// Fetch client payment history
const getPaymentHistory = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    try {
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const clientId = client._id || client.id;
        const payments = await db_1.default.Payment.find({
            $or: [
                { clientId },
                { clientId: userId }
            ],
            tenantId
        })
            .populate('couponId')
            .populate('planId')
            .sort({ createdAt: -1 })
            .lean();
        const couponIds = [...new Set(payments.map((p) => p.couponId ? (typeof p.couponId === 'object' ? p.couponId._id || p.couponId.id : p.couponId) : null).filter(Boolean))];
        const coupons = await db_1.default.Coupon.find({ _id: { $in: couponIds } }).lean();
        const couponMap = new Map(coupons.map((c) => [String(c._id || c.id), { ...c, id: String(c._id || c.id) }]));
        const tenantObj = await db_1.default.Tenant.findById(tenantId).lean();
        const isGstEnabled = tenantObj?.gstEnabled !== false;
        const gstCalculationType = tenantObj?.gstCalculationType || 'INCLUSIVE';
        const formatted = payments.map((p) => {
            const cIdStr = p.couponId ? String(typeof p.couponId === 'object' ? (p.couponId._id || p.couponId.id) : p.couponId) : null;
            const couponObj = (p.couponId && typeof p.couponId === 'object' && p.couponId.code) ? p.couponId : (cIdStr ? couponMap.get(cIdStr) : null);
            return {
                ...p,
                id: String(p._id || p.id),
                coupon: couponObj || null,
                couponCode: couponObj?.code || null,
                plan: p.planId || null,
                gstEnabled: isGstEnabled,
                gstCalculationType
            };
        });
        return res.status(200).json({ success: true, data: formatted, gstEnabled: isGstEnabled, gstCalculationType });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getPaymentHistory = getPaymentHistory;
// Update client profile
const updateProfile = async (req, res) => {
    const { tenantId, id: userId } = req.user;
    const { addressLine1, city, state, zipCode, occupation, name, mobile } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId }).lean();
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const clientUpdate = {};
        if (occupation !== undefined)
            clientUpdate.occupation = occupation;
        if (name)
            clientUpdate.name = name;
        if (mobile)
            clientUpdate.mobile = mobile;
        if (Object.keys(clientUpdate).length > 0) {
            await db_1.default.Client.findByIdAndUpdate(client._id || client.id, {
                $set: clientUpdate
            });
        }
        if (name) {
            await db_1.default.User.findByIdAndUpdate(userId, {
                $set: { firstName: name }
            });
        }
        await db_1.default.ClientProfile.findOneAndUpdate({ clientId: client._id || client.id }, {
            $set: { addressLine1, city, state, zipCode },
            $setOnInsert: { clientId: client._id || client.id, country: 'India' }
        }, { upsert: true, returnDocument: 'after' });
        await (0, auditService_1.logAudit)({
            tenantId,
            userId,
            action: 'UPDATE',
            module: 'CLIENTS',
            ipAddress: req.ip
        });
        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.updateProfile = updateProfile;
// Fetch client notifications
const getNotifications = async (req, res) => {
    const { tenantId, id: userId, email } = req.user;
    try {
        const client = await db_1.default.Client.findOne({ userId }).lean();
        const clientId = client?._id?.toString() || client?.id;
        const orConditions = [
            { recipient: String(userId) },
            { recipient: email }
        ];
        if (clientId) {
            orConditions.push({ recipient: String(clientId) });
            orConditions.push({ 'data.clientId': String(clientId) });
        }
        const query = {
            $or: orConditions
        };
        if (tenantId) {
            query.tenantId = tenantId;
        }
        const notifications = await db_1.default.NotificationLog.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const formatted = notifications.map((n) => ({
            ...n,
            id: String(n._id || n.id),
            read: n.isRead || n.read || n.status === 'READ',
            isRead: n.isRead || n.read || n.status === 'READ'
        }));
        return res.status(200).json({ success: true, data: formatted });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getNotifications = getNotifications;
// Mark client notifications as read
const markNotificationsAsRead = async (req, res) => {
    const { tenantId, id: userId, email } = req.user;
    const { notificationId } = req.body;
    try {
        const client = await db_1.default.Client.findOne({ userId }).lean();
        const clientId = client?._id?.toString() || client?.id;
        const orConditions = [
            { recipient: String(userId) },
            { recipient: email }
        ];
        if (clientId) {
            orConditions.push({ recipient: String(clientId) });
            orConditions.push({ 'data.clientId': String(clientId) });
        }
        const filter = {
            $or: orConditions
        };
        if (tenantId) {
            filter.tenantId = tenantId;
        }
        if (notificationId) {
            filter._id = notificationId;
        }
        await db_1.default.NotificationLog.updateMany(filter, {
            $set: { isRead: true, status: 'READ' }
        });
        return res.status(200).json({ success: true, message: 'Notifications marked as read' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.markNotificationsAsRead = markNotificationsAsRead;
