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
        // Fetch all subscriptions for the tenant that might overlap with this month
        const subscriptions = await db_1.default.subscription.findMany({
            where: {
                client: {
                    user: { tenantId }
                },
                status: { not: 'CANCELLED' },
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            },
            select: {
                startDate: true,
                endDate: true,
                clientId: true
            }
        });
        const dailyCounts = [];
        let highestCount = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            // Current day at 12:00 PM UTC to avoid timezone edge cases, or just start/end of day
            const currentDayStr = `${year}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const startOfDay = new Date(`${currentDayStr}T00:00:00.000Z`);
            const endOfDay = new Date(`${currentDayStr}T23:59:59.999Z`);
            // Count unique clients active on this day
            const activeClientIds = new Set();
            for (const sub of subscriptions) {
                if (sub.startDate <= endOfDay && sub.endDate >= startOfDay) {
                    activeClientIds.add(sub.clientId);
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
        const subscriptions = await db_1.default.subscription.findMany({
            where: {
                client: {
                    user: { tenantId }
                },
                status: { not: 'CANCELLED' },
                startDate: { lte: endOfDay },
                endDate: { gte: startOfDay }
            },
            include: {
                client: {
                    include: {
                        user: {
                            select: { email: true, mobile: true }
                        },
                        profile: true
                    }
                },
                plan: true
            }
        });
        const clientMap = new Map();
        for (const sub of subscriptions) {
            if (!clientMap.has(sub.clientId)) {
                clientMap.set(sub.clientId, {
                    id: sub.client.id,
                    name: sub.client.name,
                    email: sub.client.user?.email || sub.client.email,
                    mobile: sub.client.user?.mobile || sub.client.mobile,
                    pan: sub.client.pan,
                    state: sub.client.profile?.state || 'N/A',
                    city: sub.client.profile?.city || 'N/A',
                    kycDate: sub.client.profile?.createdAt || null,
                    activePlans: []
                });
            }
            clientMap.get(sub.clientId).activePlans.push({
                planName: sub.plan.name,
                startDate: sub.startDate,
                endDate: sub.endDate,
                totalFees: sub.amountTotal || sub.amountBase || sub.plan.price
            });
        }
        const clients = Array.from(clientMap.values());
        res.json({ success: true, data: clients });
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
        const subscriptions = await db_1.default.subscription.findMany({
            where: {
                client: { user: { tenantId } },
                status: { not: 'CANCELLED' },
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            },
            include: {
                client: {
                    include: {
                        user: { select: { email: true, mobile: true } },
                        profile: true
                    }
                },
                plan: true
            }
        });
        const clientMap = new Map();
        for (const sub of subscriptions) {
            if (!clientMap.has(sub.clientId)) {
                clientMap.set(sub.clientId, {
                    id: sub.client.id,
                    name: sub.client.name,
                    email: sub.client.user?.email || sub.client.email,
                    mobile: sub.client.user?.mobile || sub.client.mobile,
                    pan: sub.client.pan,
                    state: sub.client.profile?.state || 'N/A',
                    city: sub.client.profile?.city || 'N/A',
                    kycDate: sub.client.profile?.createdAt || null,
                    activePlans: []
                });
            }
            clientMap.get(sub.clientId).activePlans.push({
                planName: sub.plan.name,
                startDate: sub.startDate,
                endDate: sub.endDate,
                totalFees: sub.amountTotal || sub.amountBase || sub.plan.price
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
