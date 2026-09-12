"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = exports.updateProfile = exports.getPaymentHistory = exports.getSubscriptions = void 0;
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
        const formatted = subscriptions.map((s) => ({
            ...s,
            id: String(s._id || s.id),
            plan: s.planId ? {
                ...s.planId,
                id: String(s.planId._id || s.planId.id)
            } : null
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
            .sort({ createdAt: -1 })
            .lean();
        const formatted = payments.map((p) => ({
            ...p,
            id: String(p._id || p.id),
            coupon: p.couponId || null
        }));
        return res.status(200).json({ success: true, data: formatted });
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
        const notifications = await db_1.default.NotificationLog.find({
            tenantId,
            $or: [
                { recipient: email },
                { recipient: userId }
            ]
        })
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({ success: true, data: notifications });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getNotifications = getNotifications;
