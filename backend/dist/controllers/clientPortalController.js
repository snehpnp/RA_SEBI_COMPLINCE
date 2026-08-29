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
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const subscriptions = await db_1.default.subscription.findMany({
            where: { clientId: client.id },
            include: { plan: true },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: subscriptions });
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
        const client = await db_1.default.client.findUnique({ where: { userId } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        const payments = await db_1.default.payment.findMany({
            include: { coupon: true },
            where: { clientId: client.id, tenantId },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: payments });
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
        const client = await db_1.default.client.findUnique({ where: { userId }, include: { profile: true } });
        if (!client)
            return res.status(404).json({ success: false, message: 'Client not found.' });
        // Update Client basic details
        await db_1.default.client.update({
            where: { id: client.id },
            data: {
                occupation,
                ...(name && { name }),
                ...(mobile && { mobile })
            }
        });
        // Also update User if name provided
        if (name) {
            await db_1.default.user.update({
                where: { id: userId },
                data: { firstName: name }
            });
        }
        // Update or Create Client Profile
        if (client.profile) {
            await db_1.default.clientProfile.update({
                where: { id: client.profile.id },
                data: { addressLine1, city, state, zipCode }
            });
        }
        else {
            await db_1.default.clientProfile.create({
                data: {
                    clientId: client.id,
                    addressLine1,
                    city,
                    state,
                    zipCode
                }
            });
        }
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
        const notifications = await db_1.default.notificationLog.findMany({
            where: {
                tenantId,
                OR: [
                    { recipient: email },
                    { recipient: userId }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: notifications });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
    }
};
exports.getNotifications = getNotifications;
