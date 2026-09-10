"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveClientsByMonthExport = exports.getActiveClientsByDate = exports.getActiveClientSummary = void 0;
const db_1 = __importDefault(require("../config/db"));
const getActiveClientSummary = async (req, res) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (!month || typeof month !== 'string') {
            return res.status(400).json({ success: false, message: 'Month parameter (YYYY-MM) is required' });
        }
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10);
        if (isNaN(year) || isNaN(monthNum)) {
            return res.status(400).json({ success: false, message: 'Invalid month format' });
        }
        // Get number of days in the month
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
        const clients = await db_1.default.Client.find({ tenantId }).lean();
        const clientIds = clients.map((c) => c._id || c.id);
        // Fetch all subscriptions for the tenant that might overlap with this month
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: clientIds },
            status: { $ne: 'CANCELLED' },
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        })
            .select('startDate endDate clientId')
            .lean();
        const dailyCounts = [];
        let highestCount = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayStr = `${year}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const startOfDay = new Date(`${currentDayStr}T00:00:00.000Z`);
            const endOfDay = new Date(`${currentDayStr}T23:59:59.999Z`);
            const activeClientIds = new Set();
            for (const sub of subscriptions) {
                if (new Date(sub.startDate) <= endOfDay && new Date(sub.endDate) >= startOfDay) {
                    activeClientIds.add(String(sub.clientId));
                }
            }
            const count = activeClientIds.size;
            dailyCounts.push({
                date: currentDayStr,
                count
            });
            if (count > highestCount) {
                highestCount = count;
            }
        }
        res.json({
            success: true,
            data: {
                dailyCounts,
                highestCount,
                month
            }
        });
    }
    catch (error) {
        console.error('Error fetching active client summary:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getActiveClientSummary = getActiveClientSummary;
const getActiveClientsByDate = async (req, res) => {
    try {
        const { date } = req.query; // format: YYYY-MM-DD
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required' });
        }
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);
        const clients = await db_1.default.Client.find({ tenantId })
            .populate('userId', 'email mobile')
            .lean();
        const clientIds = clients.map((c) => c._id || c.id);
        const clientMapById = new Map(clients.map((c) => [String(c._id || c.id), c]));
        const profiles = await db_1.default.ClientProfile.find({ clientId: { $in: clientIds } }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.clientId), p]));
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: clientIds },
            status: { $ne: 'CANCELLED' },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        })
            .populate('planId')
            .lean();
        const clientMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            const client = clientMapById.get(cId);
            const profile = profileMap.get(cId);
            if (!clientMap.has(cId)) {
                clientMap.set(cId, {
                    id: cId,
                    name: client?.name || 'Client',
                    email: client?.userId?.email || client?.email,
                    mobile: client?.userId?.mobile || client?.mobile,
                    pan: client?.pan,
                    state: profile?.state || 'N/A',
                    city: profile?.city || 'N/A',
                    kycDate: profile?.createdAt || null,
                    activePlans: []
                });
            }
            const plan = sub.planId || {};
            clientMap.get(cId).activePlans.push({
                planName: plan.name || 'Plan',
                startDate: sub.startDate,
                endDate: sub.endDate,
                totalFees: sub.amountTotal || sub.amountBase || plan.price || 0
            });
        }
        const result = Array.from(clientMap.values());
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error fetching active clients by date:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getActiveClientsByDate = getActiveClientsByDate;
const getActiveClientsByMonthExport = async (req, res) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        if (!month || typeof month !== 'string')
            return res.status(400).json({ success: false, message: 'Month parameter is required' });
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStr, 10);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
        const clients = await db_1.default.Client.find({ tenantId })
            .populate('userId', 'email mobile')
            .lean();
        const clientIds = clients.map((c) => c._id || c.id);
        const clientMapById = new Map(clients.map((c) => [String(c._id || c.id), c]));
        const profiles = await db_1.default.ClientProfile.find({ clientId: { $in: clientIds } }).lean();
        const profileMap = new Map(profiles.map((p) => [String(p.clientId), p]));
        const subscriptions = await db_1.default.Subscription.find({
            clientId: { $in: clientIds },
            status: { $ne: 'CANCELLED' },
            startDate: { $lte: endDate },
            endDate: { $gte: startDate }
        })
            .populate('planId')
            .lean();
        const clientMap = new Map();
        for (const sub of subscriptions) {
            const cId = String(sub.clientId);
            const client = clientMapById.get(cId);
            const profile = profileMap.get(cId);
            if (!clientMap.has(cId)) {
                clientMap.set(cId, {
                    id: cId,
                    name: client?.name || 'Client',
                    email: client?.userId?.email || client?.email,
                    mobile: client?.userId?.mobile || client?.mobile,
                    pan: client?.pan,
                    state: profile?.state || 'N/A',
                    city: profile?.city || 'N/A',
                    kycDate: profile?.createdAt || null,
                    activePlans: []
                });
            }
            const plan = sub.planId || {};
            clientMap.get(cId).activePlans.push({
                planName: plan.name || 'Plan',
                startDate: sub.startDate,
                endDate: sub.endDate,
                totalFees: sub.amountTotal || sub.amountBase || plan.price || 0
            });
        }
        res.json({ success: true, data: Array.from(clientMap.values()) });
    }
    catch (error) {
        console.error('Error in month export:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getActiveClientsByMonthExport = getActiveClientsByMonthExport;
