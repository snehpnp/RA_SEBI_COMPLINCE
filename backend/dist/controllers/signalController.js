"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSignalMessage = exports.uploadReport = exports.closeSignal = exports.listSignals = exports.createSignal = exports.getStocks = void 0;
const db_1 = __importDefault(require("../config/db"));
const getStocks = async (req, res) => {
    try {
        const { query } = req.query;
        let whereClause = {};
        if (query && typeof query === 'string' && query.trim() !== '') {
            const q = query.trim();
            whereClause = {
                $or: [
                    { symbol: { $regex: q, $options: 'i' } },
                    { name: { $regex: q, $options: 'i' } }
                ]
            };
        }
        const stocks = await db_1.default.Stock.find(whereClause)
            .limit(50)
            .sort({ symbol: 1 })
            .lean();
        const formattedStocks = stocks.map((s) => ({
            ...s,
            id: s._id?.toString() || s.id
        }));
        return res.json({ success: true, data: formattedStocks });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getStocks = getStocks;
const createSignal = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { segment, planIds, callType, tradeDuration, stockId, expiryDate, strikePrice, optionType, entryPrice, entryType, suggestedQuantity, target1, target2, target3, stoploss, description } = req.body;
        let reportUrl = null;
        if (req.file) {
            reportUrl = `/uploads/research/${req.file.filename}`;
        }
        const userRole = req.user.role;
        const isFullAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
        if (!isFullAdmin) {
            const roleDoc = await db_1.default.Role.findOne({ name: userRole }).lean();
            const roleId = roleDoc?._id;
            const addPerm = await db_1.default.Permission.findOne({ code: 'ADD_RESEARCH' }).lean();
            const ownPerm = await db_1.default.Permission.findOne({ code: 'OWN_RESEARCH' }).lean();
            const hasAdd = addPerm && roleId ? await db_1.default.RolePermission.findOne({ roleId, permissionId: addPerm._id }).lean() : null;
            const hasOwn = ownPerm && roleId ? await db_1.default.RolePermission.findOne({ roleId, permissionId: ownPerm._id }).lean() : null;
            if (!hasAdd && !hasOwn) {
                return res.status(403).json({ success: false, message: 'You do not have permission to create signals.' });
            }
        }
        let parsedPlanIds = [];
        try {
            parsedPlanIds = JSON.parse(planIds);
        }
        catch (e) {
            if (typeof planIds === 'string')
                parsedPlanIds = [planIds];
        }
        if (!parsedPlanIds || parsedPlanIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one plan.' });
        }
        const createdSignals = [];
        for (const pId of parsedPlanIds) {
            const newSignal = await db_1.default.Signal.create({
                tenantId,
                segment,
                planId: pId,
                callType,
                tradeDuration,
                stockId,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                strikePrice: strikePrice ? parseFloat(strikePrice) : null,
                optionType: optionType || null,
                entryPrice: parseFloat(entryPrice),
                entryType,
                suggestedQuantity,
                target1: parseFloat(target1),
                target2: target2 ? parseFloat(target2) : null,
                target3: target3 ? parseFloat(target3) : null,
                stoploss: parseFloat(stoploss),
                description,
                reportUrl,
                createdById: userId,
                status: 'OPEN'
            });
            createdSignals.push({
                ...newSignal.toObject(),
                id: newSignal._id.toString()
            });
        }
        return res.json({ success: true, data: createdSignals, message: 'Signals added successfully.' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createSignal = createSignal;
const listSignals = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userRole = req.user.role;
        let whereClause = { tenantId };
        if (userRole === 'CLIENT') {
            const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
            if (!client) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Restricted',
                    errors: ['Client profile not found.']
                });
            }
            // Find all subscriptions
            const allSubs = await db_1.default.Subscription.find({ clientId: client._id }).lean();
            if (allSubs.length === 0) {
                return res.json({ success: true, data: [] });
            }
            else {
                const subConditions = allSubs.map((sub) => {
                    const conditions = {
                        planId: sub.planId,
                        createdAt: { $gte: sub.startDate }
                    };
                    if (sub.endDate) {
                        conditions.createdAt.$lte = sub.endDate;
                    }
                    return conditions;
                });
                whereClause.$or = subConditions;
            }
        }
        else {
            // Staff/Admin Permissions
            const isFullAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
            if (!isFullAdmin) {
                const roleDoc = await db_1.default.Role.findOne({ name: userRole }).lean();
                const roleId = roleDoc?._id;
                const addPerm = await db_1.default.Permission.findOne({ code: 'ADD_RESEARCH' }).lean();
                const viewPerm = await db_1.default.Permission.findOne({ code: 'VIEW_RESEARCH' }).lean();
                const ownPerm = await db_1.default.Permission.findOne({ code: 'OWN_RESEARCH' }).lean();
                const hasAdd = addPerm && roleId ? await db_1.default.RolePermission.findOne({ roleId, permissionId: addPerm._id }).lean() : null;
                const hasView = viewPerm && roleId ? await db_1.default.RolePermission.findOne({ roleId, permissionId: viewPerm._id }).lean() : null;
                const hasOwn = ownPerm && roleId ? await db_1.default.RolePermission.findOne({ roleId, permissionId: ownPerm._id }).lean() : null;
                if (!hasAdd && !hasView && !hasOwn) {
                    return res.status(403).json({ success: false, message: 'You do not have permission to view signals.' });
                }
                if (!hasAdd && !hasView && hasOwn) {
                    whereClause.createdById = req.user.id;
                }
            }
        }
        const signals = await db_1.default.Signal.find(whereClause)
            .populate('stock')
            .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 } }
        })
            .sort({ createdAt: -1 })
            .lean();
        const planIds = signals.map((s) => s.planId).filter(Boolean);
        const plans = await db_1.default.Plan.find({ _id: { $in: planIds } }).lean();
        const categories = await db_1.default.PlanCategory.find({ _id: { $in: planIds } }).lean();
        const map = new Map();
        plans.forEach((p) => map.set(p._id.toString(), p.name));
        categories.forEach((c) => map.set(c._id.toString(), c.name));
        // Manually fetch researcher names
        const userIds = [...new Set(signals.map((s) => s.createdById).filter(Boolean))];
        const users = await db_1.default.User.find({ _id: { $in: userIds } }).select('id firstName lastName').lean();
        const userMap = new Map();
        users.forEach((u) => userMap.set(u._id.toString(), `${u.firstName || ''} ${u.lastName || ''}`.trim()));
        const finalData = signals.map((s) => {
            const pIdStr = s.planId?.toString();
            const cIdStr = s.createdById?.toString();
            const stock = s.stockId || s.stock;
            return {
                ...s,
                id: s._id?.toString() || s.id,
                stock: stock ? {
                    ...stock,
                    id: stock._id?.toString() || stock.id
                } : null,
                planName: (pIdStr && map.get(pIdStr)) || pIdStr || '',
                createdByName: (cIdStr && userMap.get(cIdStr)) || 'Unknown Researcher'
            };
        });
        return res.json({ success: true, data: finalData });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.listSignals = listSignals;
const closeSignal = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { closeStatus, exitPrice, closeRemark, closeTargets, isFinalClose } = req.body;
        const signal = await db_1.default.Signal.findOne({ _id: id, tenantId })
            .populate('stock')
            .lean();
        if (!signal) {
            return res.status(404).json({ success: false, message: 'Signal not found' });
        }
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(id, {
            $set: {
                status: isFinalClose ? 'CLOSED' : 'OPEN',
                closeStatus,
                exitPrice: exitPrice ? parseFloat(exitPrice) : null,
                closeRemark,
                closeTargets,
                closedAt: isFinalClose ? new Date() : null
            }
        }, { returnDocument: 'after', lean: true });
        // Notify clients who were subscribed to this plan AT THE TIME the signal was created
        const allSubs = await db_1.default.Subscription.find({
            planId: signal.planId,
            startDate: { $lte: signal.createdAt }
        })
            .populate({
            path: 'clientId',
            populate: { path: 'userId', select: '_id id firstName lastName' }
        })
            .lean();
        const sig = signal;
        const eligibleSubs = allSubs.filter((sub) => !sub.endDate || new Date(sub.endDate) >= new Date(signal.createdAt));
        const stock = sig.stockId || sig.stock || {};
        const stockSymbol = stock.symbol || 'Stock';
        const notificationPromises = eligibleSubs.map((sub) => {
            const client = sub.clientId || sub.client;
            const user = client?.userId || client?.user;
            const recipientId = user?._id || client?.userId;
            if (!recipientId)
                return null;
            return db_1.default.NotificationLog.create({
                tenantId,
                recipient: recipientId,
                channel: 'INAPP',
                title: `Signal Update: ${stockSymbol}`,
                message: `The signal for ${stockSymbol} has been closed/updated. Status: ${closeStatus}. ${closeRemark ? `Remark: ${closeRemark}` : ''}`
            });
        }).filter(Boolean);
        await Promise.all(notificationPromises);
        return res.json({
            success: true,
            data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null,
            message: 'Signal closed successfully and clients notified.'
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.closeSignal = closeSignal;
const uploadReport = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const reportUrl = `/uploads/research/${req.file.filename}`;
        const signal = await db_1.default.Signal.findOne({ _id: id, tenantId });
        if (!signal) {
            return res.status(404).json({ success: false, message: 'Signal not found' });
        }
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(id, { $set: { reportUrl } }, { returnDocument: 'after', lean: true });
        return res.json({
            success: true,
            data: updatedSignal ? { ...updatedSignal, id: updatedSignal._id?.toString() || updatedSignal.id } : null,
            message: 'Report uploaded successfully.'
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.uploadReport = uploadReport;
const addSignalMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        const signalMessage = await db_1.default.SignalMessage.create({
            signalId: id,
            message
        });
        const signal = await db_1.default.Signal.findById(id)
            .populate('stock')
            .lean();
        if (signal) {
            const tenantId = req.user.tenantId || signal.tenantId;
            const allSubs = await db_1.default.Subscription.find({
                planId: signal.planId,
                startDate: { $lte: signal.createdAt }
            })
                .populate({
                path: 'clientId',
                populate: { path: 'userId', select: '_id id' }
            })
                .lean();
            const eligibleSubs = allSubs.filter((sub) => !sub.endDate || new Date(sub.endDate) >= new Date(signal.createdAt));
            const sig = signal;
            const stock = sig.stockId || sig.stock || {};
            const stockSymbol = stock.symbol || 'Stock';
            const notificationPromises = eligibleSubs.map((sub) => {
                const client = sub.clientId || sub.client;
                const user = client?.userId || client?.user;
                const recipientId = user?._id || client?.userId;
                if (!recipientId)
                    return null;
                return db_1.default.NotificationLog.create({
                    tenantId,
                    recipient: recipientId,
                    channel: 'INAPP',
                    title: `Trade Update: ${stockSymbol}`,
                    message: `New update on trade ${stockSymbol}: ${message}`
                });
            }).filter(Boolean);
            await Promise.all(notificationPromises);
        }
        res.status(201).json({
            success: true,
            message: 'Alert sent successfully',
            data: {
                ...signalMessage.toObject(),
                id: signalMessage._id.toString()
            }
        });
    }
    catch (error) {
        console.error('Error adding signal message:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.addSignalMessage = addSignalMessage;
