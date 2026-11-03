"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSignalMessage = exports.uploadReport = exports.closeSignal = exports.listSignals = exports.createSignal = exports.getStocks = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_lib_1 = require("pdf-lib");
const db_1 = __importDefault(require("../config/db"));
const notificationService_1 = require("../services/notificationService");
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
        const { segment, categoryIds, planCategoryIds, planIds, callType, tradeDuration, stockId, expiryDate, strikePrice, optionType, entryPrice, entryType, suggestedQuantity, target1, target2, target3, stoploss, description } = req.body;
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
        let rawTargetIds = [];
        const sourceParam = categoryIds || planCategoryIds || planIds;
        try {
            rawTargetIds = JSON.parse(sourceParam);
        }
        catch (e) {
            if (typeof sourceParam === 'string')
                rawTargetIds = [sourceParam];
        }
        if (!Array.isArray(rawTargetIds))
            rawTargetIds = [rawTargetIds].filter(Boolean);
        rawTargetIds = [...new Set(rawTargetIds.map((id) => (id ? (id._id?.toString() || id.id || id.toString()) : null)).filter(Boolean))];
        if (!rawTargetIds || rawTargetIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one plan category.' });
        }
        // Match which IDs are categories vs plans
        const validObjectIds = rawTargetIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)).map((id) => new mongoose_1.default.Types.ObjectId(id));
        const matchedCategories = await db_1.default.PlanCategory.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { id: { $in: rawTargetIds } }
            ]
        }).lean();
        const categoryMap = new Map();
        matchedCategories.forEach((c) => {
            categoryMap.set(c._id.toString(), c);
            if (c.id)
                categoryMap.set(c.id.toString(), c);
        });
        const createdSignals = [];
        const allPlanIdsToNotify = [];
        const allCategoryIdsToNotify = [];
        for (const tId of rawTargetIds) {
            let catId = null;
            let pId = null;
            if (categoryMap.has(tId)) {
                const matchedCat = categoryMap.get(tId);
                catId = matchedCat._id;
                allCategoryIdsToNotify.push(catId.toString());
                const plansUnderCategory = await db_1.default.Plan.find({
                    $or: [
                        { categoryId: catId },
                        { categoryId: catId.toString() }
                    ]
                }).select('_id id').lean();
                if (plansUnderCategory.length > 0) {
                    pId = plansUnderCategory[0]._id;
                    plansUnderCategory.forEach((p) => {
                        allPlanIdsToNotify.push(p._id.toString());
                        if (p.id)
                            allPlanIdsToNotify.push(p.id.toString());
                    });
                }
            }
            else {
                const planDoc = await db_1.default.Plan.findById(tId).lean() || await db_1.default.Plan.findOne({ id: tId }).lean();
                if (planDoc) {
                    pId = planDoc._id || planDoc.id;
                    catId = planDoc.categoryId || null;
                    allPlanIdsToNotify.push(pId.toString());
                    if (catId)
                        allCategoryIdsToNotify.push(catId.toString());
                }
                else {
                    pId = tId;
                    allPlanIdsToNotify.push(tId.toString());
                }
            }
            const newSignal = await db_1.default.Signal.create({
                tenantId,
                segment,
                categoryId: catId,
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
        // Return immediate response so researcher modal closes in milliseconds without waiting for external SMS/Telegram network latency
        res.json({ success: true, data: createdSignals, message: 'Signals added successfully.' });
        // Broadcast real-time alerts asynchronously in the background
        setImmediate(async () => {
            try {
                const stockDoc = await db_1.default.Stock.findById(stockId).lean();
                const stockSymbol = stockDoc?.symbol || 'Trade Signal';
                const user = req.user;
                const researcherName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Researcher';
                await (0, notificationService_1.broadcastSignalNotification)({
                    tenantId,
                    planIds: allPlanIdsToNotify.length > 0 ? allPlanIdsToNotify : rawTargetIds,
                    categoryIds: allCategoryIdsToNotify,
                    title: `🚀 New Trade Alert: ${stockSymbol} (${segment})`,
                    message: `New ${callType} recommendation for ${stockSymbol} at ₹${entryPrice}. Target: ${target1}${target2 ? `/${target2}` : ''}, SL: ₹${stoploss}. View: ${tradeDuration || 'INTRADAY'}.`,
                    type: 'signal',
                    data: {
                        signalId: createdSignals[0]?.id,
                        stockSymbol,
                        callType,
                        entryPrice,
                        target1,
                        target2,
                        target3,
                        stoploss,
                        segment,
                        expiryDate: expiryDate || null,
                        strikePrice: strikePrice || null,
                        optionType: optionType || null,
                        tradeDuration,
                        action: 'NEW_TRADE',
                        smsOrderedVariables: req.body.smsOrderedVariables ? ((() => {
                            try {
                                return typeof req.body.smsOrderedVariables === 'string' ? JSON.parse(req.body.smsOrderedVariables) : req.body.smsOrderedVariables;
                            }
                            catch (e) {
                                return undefined;
                            }
                        })()) : undefined
                    },
                    adminTitle: `📢 New Trade Published: ${stockSymbol} (${segment})`,
                    adminMessage: `${researcherName} published a new ${callType} trade for ${stockSymbol} at ₹${entryPrice} in ${segment}.`
                });
            }
            catch (notifErr) {
                console.warn('[Notification] Failed to broadcast new signal notification in background:', notifErr);
            }
        });
        return;
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createSignal = createSignal;
function calculatePotential(s) {
    const callType = (s.callType || 'BUY').toUpperCase();
    const isBuy = callType === 'BUY';
    const lastTarget = Number(s.target3 || s.target2 || s.target1 || s.entryPrice || 0);
    const entryPrice = Number(s.entryPrice || 0);
    const target1 = Number(s.target1 || entryPrice);
    const isTarget1Done = Boolean((s.closeTargets && s.closeTargets.includes('TARGET1')) ||
        s.closeStatus === 'PARTIALLY_CLOSED' ||
        s.closeStatus === 'TARGET1_DONE' ||
        s.closeStatus === 'TARGET_1_REACHED');
    const basePrice = isTarget1Done ? target1 : entryPrice;
    let remainingPct = 0;
    if (basePrice > 0 && lastTarget > 0) {
        if (isBuy) {
            remainingPct = Math.max(0, ((lastTarget - basePrice) / basePrice) * 100);
        }
        else {
            remainingPct = Math.max(0, ((basePrice - lastTarget) / basePrice) * 100);
        }
    }
    const formattedPct = remainingPct.toFixed(1);
    const directionText = isBuy ? 'Upside' : 'Downside';
    const potentialMessage = isTarget1Done
        ? `🎯 Target 1 Done • +${formattedPct}% ${directionText} Remaining`
        : `🔥 +${formattedPct}% Potential ${directionText} Remaining`;
    return {
        remainingPotentialPercent: parseFloat(formattedPct),
        isTarget1Done,
        potentialMessage,
        directionText
    };
}
const listSignals = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userRole = req.user.role;
        if (userRole === 'CLIENT') {
            const client = await db_1.default.Client.findOne({ userId: req.user.id }).lean();
            if (!client) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Restricted',
                    errors: ['Client profile not found.']
                });
            }
            // Check KYC and Agreement compliance
            const isKycDone = Boolean(client.kraVerified === true || client.kycStatus === 'VERIFIED' || client.kycStatus === 'APPROVED');
            const hasAgreementDoc = await db_1.default.Agreement.findOne({
                $or: [{ clientId: client._id }, { clientId: client.userId }],
                status: { $in: ['SIGNED', 'ACTIVE'] }
            }).lean();
            const isAgreementDone = Boolean(client.agreementSigned === true || hasAgreementDoc);
            const isCompliant = isKycDone && isAgreementDone;
            // Find all subscriptions for this client
            const allSubs = await db_1.default.Subscription.find({
                clientId: client._id,
                status: { $in: ['ACTIVE', 'active'] }
            }).lean();
            // If client has an assigned/active plan BUT KYC or Agreement is pending:
            // STRICT SEBI COMPLIANCE: Do not show open trades on dashboard or signals list
            if (allSubs.length > 0 && !isCompliant) {
                return res.json({
                    success: true,
                    data: [],
                    compliancePending: true,
                    message: 'Compliance Pending: Please complete KYC & Sign Agreement to access active trade recommendations.'
                });
            }
            // Fetch tenant settings to get lockedTradesPreviewCount and potential toggles
            const tenantDoc = await db_1.default.Tenant.findById(tenantId).lean() || await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
            const previewLimit = tenantDoc?.lockedTradesPreviewCount !== undefined ? tenantDoc.lockedTradesPreviewCount : 5;
            const showOpenTradePotential = tenantDoc?.showOpenTradePotential !== false;
            const showLockedTradePotential = tenantDoc?.showLockedTradePotential !== false;
            let unlockedSignals = [];
            const subscribedPlanIds = allSubs.map((s) => s.planId.toString());
            const validSubPlanObjectIds = subscribedPlanIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)).map((id) => new mongoose_1.default.Types.ObjectId(id));
            const subscribedPlans = await db_1.default.Plan.find({
                $or: [
                    ...(validSubPlanObjectIds.length > 0 ? [{ _id: { $in: validSubPlanObjectIds } }] : []),
                    { id: { $in: subscribedPlanIds } }
                ]
            }).select('categoryId').lean();
            const planCategoryMap = new Map();
            const subscribedCategoryIds = [];
            subscribedPlans.forEach((p) => {
                if (p.categoryId) {
                    const cId = p.categoryId.toString();
                    subscribedCategoryIds.push(cId);
                    planCategoryMap.set(p._id.toString(), cId);
                    if (p.id)
                        planCategoryMap.set(p.id.toString(), cId);
                }
            });
            const validSubCatObjectIds = subscribedCategoryIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id)).map((id) => new mongoose_1.default.Types.ObjectId(id));
            if (allSubs.length > 0) {
                const subConditions = allSubs.map((sub) => {
                    const subPlanIdStr = sub.planId.toString();
                    const subCatId = planCategoryMap.get(subPlanIdStr);
                    const orConditions = [{ planId: sub.planId }];
                    if (subCatId && mongoose_1.default.Types.ObjectId.isValid(subCatId)) {
                        orConditions.push({ categoryId: new mongoose_1.default.Types.ObjectId(subCatId) });
                    }
                    else if (subCatId) {
                        orConditions.push({ categoryId: subCatId });
                    }
                    const conditions = {
                        $or: orConditions,
                        createdAt: { $gte: sub.startDate }
                    };
                    if (sub.endDate) {
                        const end = new Date(sub.endDate);
                        const endOfDayUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));
                        const endOfDayLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
                        conditions.createdAt.$lte = new Date(Math.max(end.getTime(), endOfDayUtc.getTime(), endOfDayLocal.getTime()));
                    }
                    return conditions;
                });
                unlockedSignals = await db_1.default.Signal.find({
                    tenantId,
                    $or: subConditions
                })
                    .populate({ path: 'messages', options: { sort: { createdAt: -1 } } })
                    .sort({ createdAt: -1 })
                    .lean();
            }
            // Fetch teaser locked signals from plans the user does NOT have active subscriptions for
            let lockedSignals = [];
            if (previewLimit > 0) {
                const lockedWhere = {
                    tenantId,
                    status: 'OPEN'
                };
                const excludeFilters = [];
                if (subscribedPlanIds.length > 0) {
                    excludeFilters.push({ planId: { $nin: [...validSubPlanObjectIds, ...subscribedPlanIds] } });
                }
                if (subscribedCategoryIds.length > 0) {
                    excludeFilters.push({ categoryId: { $nin: [...validSubCatObjectIds, ...subscribedCategoryIds] } });
                }
                if (excludeFilters.length > 0) {
                    lockedWhere.$and = excludeFilters;
                }
                lockedSignals = await db_1.default.Signal.find(lockedWhere)
                    .sort({ createdAt: -1 })
                    .limit(previewLimit)
                    .lean();
            }
            // Collect plan IDs and stock IDs for mapping
            const allSignalsToMap = [...unlockedSignals, ...lockedSignals];
            const rawPlanIds = allSignalsToMap.map((s) => s.planId?.toString?.() || s.planId).filter(Boolean);
            const validPlanObjectIds = rawPlanIds
                .filter((id) => mongoose_1.default.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.default.Types.ObjectId(id));
            const plans = await db_1.default.Plan.find({
                $or: [
                    ...(validPlanObjectIds.length > 0 ? [{ _id: { $in: validPlanObjectIds } }] : []),
                    { id: { $in: rawPlanIds } }
                ]
            }).lean();
            const categories = await db_1.default.PlanCategory.find({
                $or: [
                    ...(validPlanObjectIds.length > 0 ? [{ _id: { $in: validPlanObjectIds } }] : []),
                    { id: { $in: rawPlanIds } }
                ]
            }).lean();
            const planMap = new Map();
            plans.forEach((p) => {
                planMap.set(p._id.toString(), p.name);
                if (p.id)
                    planMap.set(p.id.toString(), p.name);
            });
            categories.forEach((c) => {
                planMap.set(c._id.toString(), c.name);
                if (c.id)
                    planMap.set(c.id.toString(), c.name);
            });
            const userIds = [...new Set(allSignalsToMap.map((s) => s.createdById).filter(Boolean))];
            const users = await db_1.default.User.find({ _id: { $in: userIds } }).select('id firstName lastName').lean();
            const userMap = new Map();
            users.forEach((u) => userMap.set(u._id.toString(), `${u.firstName || ''} ${u.lastName || ''}`.trim()));
            const stockIdList = allSignalsToMap
                .map((s) => s.stockId?._id || s.stockId || s.stock?._id || s.stock)
                .filter(Boolean)
                .map((id) => id.toString());
            const uniqueStockIds = [...new Set(stockIdList)];
            const validStockObjectIds = uniqueStockIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
            const stocks = await db_1.default.Stock.find({
                $or: [
                    ...(validStockObjectIds.length > 0 ? [{ _id: { $in: validStockObjectIds } }] : []),
                    { id: { $in: uniqueStockIds } }
                ]
            }).lean();
            const stockMap = new Map();
            stocks.forEach((st) => {
                const sId = String(st._id || st.id);
                stockMap.set(sId, { ...st, id: sId });
            });
            // Map unlocked signals
            const mappedUnlocked = unlockedSignals.map((s) => {
                const pIdStr = s.planId?.toString();
                const cIdStr = s.createdById?.toString();
                const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
                const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
                    (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null) ||
                    (typeof s.stock === 'object' && s.stock?.symbol ? s.stock : null);
                const potential = showOpenTradePotential
                    ? calculatePotential(s)
                    : { remainingPotentialPercent: null, isTarget1Done: false, potentialMessage: null, directionText: null };
                return {
                    ...s,
                    id: s._id?.toString() || s.id,
                    isLocked: false,
                    stockId: sIdStr,
                    stock: matchedStock ? { ...matchedStock, id: String(matchedStock._id || matchedStock.id) } : null,
                    symbol: matchedStock?.symbol || s.symbol || '',
                    stockName: matchedStock?.name || s.stockName || '',
                    planId: pIdStr || (s.planId ? s.planId.toString() : ''),
                    planName: (s.categoryId && planMap.get(s.categoryId.toString())) || (pIdStr && planMap.get(pIdStr)) || pIdStr || '',
                    createdByName: (cIdStr && userMap.get(cIdStr)) || 'Unknown Researcher',
                    ...potential
                };
            });
            // Map locked teaser signals
            const mappedLocked = lockedSignals.map((s) => {
                const pIdStr = s.planId?.toString();
                const potential = showLockedTradePotential
                    ? calculatePotential(s)
                    : { remainingPotentialPercent: null, isTarget1Done: false, potentialMessage: null, directionText: null };
                const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
                const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
                    (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null);
                const rawSymbol = matchedStock?.symbol || 'STOCK';
                const maskedSymbol = rawSymbol.length > 2 ? `${rawSymbol.slice(0, 1)}****` : 'T****';
                return {
                    id: s._id?.toString() || s.id,
                    _id: s._id,
                    isLocked: true,
                    symbol: maskedSymbol,
                    stockName: 'Locked Recommendation',
                    segment: s.segment || 'CASH',
                    callType: s.callType || 'BUY',
                    tradeDuration: s.tradeDuration || 'INTRADAY',
                    planId: pIdStr || (s.planId ? s.planId.toString() : ''),
                    planName: (s.categoryId && planMap.get(s.categoryId.toString())) || (pIdStr && planMap.get(pIdStr)) || 'Premium Service Plan',
                    entryPrice: null,
                    target1: null,
                    target2: null,
                    target3: null,
                    stoploss: null,
                    status: 'OPEN',
                    createdAt: s.createdAt,
                    ...potential
                };
            });
            return res.json({
                success: true,
                data: [...mappedUnlocked, ...mappedLocked],
                hasActivePlan: allSubs.length > 0,
                settings: {
                    showOpenTradePotential,
                    showLockedTradePotential
                }
            });
        }
        // Staff / Admin logic
        let whereClause = { tenantId };
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
        const signals = await db_1.default.Signal.find(whereClause)
            .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 } }
        })
            .sort({ createdAt: -1 })
            .lean();
        const planIds = signals.map((s) => s.planId).filter(Boolean);
        const categoryIds = signals.map((s) => s.categoryId).filter(Boolean);
        const allLookupIds = [...new Set([...planIds, ...categoryIds])];
        const plans = await db_1.default.Plan.find({ _id: { $in: allLookupIds } }).lean();
        const categories = await db_1.default.PlanCategory.find({ _id: { $in: allLookupIds } }).lean();
        const map = new Map();
        plans.forEach((p) => map.set(p._id.toString(), p.name));
        categories.forEach((c) => map.set(c._id.toString(), c.name));
        const userIds = [...new Set(signals.map((s) => s.createdById).filter(Boolean))];
        const users = await db_1.default.User.find({ _id: { $in: userIds } }).select('id firstName lastName').lean();
        const userMap = new Map();
        users.forEach((u) => userMap.set(u._id.toString(), `${u.firstName || ''} ${u.lastName || ''}`.trim()));
        const stockIdList = signals
            .map((s) => s.stockId?._id || s.stockId || s.stock?._id || s.stock)
            .filter(Boolean)
            .map((id) => id.toString());
        const uniqueStockIds = [...new Set(stockIdList)];
        const validStockObjectIds = uniqueStockIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        const stocks = await db_1.default.Stock.find({
            $or: [
                ...(validStockObjectIds.length > 0 ? [{ _id: { $in: validStockObjectIds } }] : []),
                { id: { $in: uniqueStockIds } }
            ]
        }).lean();
        const stockMap = new Map();
        stocks.forEach((st) => {
            const sId = String(st._id || st.id);
            stockMap.set(sId, { ...st, id: sId });
        });
        const finalData = signals.map((s) => {
            const pIdStr = s.planId?.toString();
            const cIdStr = s.createdById?.toString();
            const sIdStr = s.stockId ? String(s.stockId?._id || s.stockId) : (s.stock ? String(s.stock?._id || s.stock) : '');
            const matchedStock = (sIdStr && stockMap.get(sIdStr)) ||
                (typeof s.stockId === 'object' && s.stockId?.symbol ? s.stockId : null) ||
                (typeof s.stock === 'object' && s.stock?.symbol ? s.stock : null);
            const potential = calculatePotential(s);
            return {
                ...s,
                id: s._id?.toString() || s.id,
                stockId: sIdStr,
                stock: matchedStock ? { ...matchedStock, id: String(matchedStock._id || matchedStock.id) } : null,
                symbol: matchedStock?.symbol || '',
                stockName: matchedStock?.name || '',
                planName: (s.categoryId && map.get(s.categoryId.toString())) || (pIdStr && map.get(pIdStr)) || pIdStr || '',
                createdByName: (cIdStr && userMap.get(cIdStr)) || 'Unknown Researcher',
                ...potential
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
            .populate('stockId')
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
        // Determine specific target achieved (e.g. Target 1, Target 2, Target 3 or combinations)
        const targetList = typeof closeTargets === 'string' ? closeTargets.split(',').map((s) => s.trim().toUpperCase()) : [];
        const labels = [];
        if (targetList.includes('TARGET1'))
            labels.push('Target 1');
        if (targetList.includes('TARGET2'))
            labels.push('Target 2');
        if (targetList.includes('TARGET3'))
            labels.push('Target 3');
        const targetLabel = labels.join(' & ');
        let specificTargetPrice = exitPrice ? parseFloat(exitPrice) : null;
        if (!specificTargetPrice) {
            if (targetList.includes('TARGET3') && signal.target3)
                specificTargetPrice = signal.target3;
            else if (targetList.includes('TARGET2') && signal.target2)
                specificTargetPrice = signal.target2;
            else if (targetList.includes('TARGET1') && signal.target1)
                specificTargetPrice = signal.target1;
        }
        const targetPlanId = signal.planId ? (signal.planId._id?.toString() || signal.planId.toString()) : null;
        const planIdsToNotify = targetPlanId ? [targetPlanId] : [];
        // Notify eligible subscribers and Admin
        try {
            const sig = signal;
            let stockSymbol = 'Stock';
            if (sig.stockId && typeof sig.stockId === 'object' && sig.stockId.symbol) {
                stockSymbol = sig.stockId.symbol;
            }
            else if (sig.stockId) {
                const stockDoc = await db_1.default.Stock.findById(sig.stockId).lean();
                if (stockDoc?.symbol)
                    stockSymbol = stockDoc.symbol;
            }
            const user = req.user;
            const researcherName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Researcher';
            let notifTitle = `🎯 Trade Update: ${stockSymbol}`;
            let notifMessage = `Trade ${stockSymbol} status: ${closeStatus}.${exitPrice ? ` Exit Price: ₹${exitPrice}.` : ''} ${closeRemark ? `Remark: ${closeRemark}` : ''}`;
            if (closeStatus === 'Partially Closed') {
                if (targetLabel) {
                    if (isFinalClose) {
                        notifTitle = `🎯 ${targetLabel} Achieved & Trade Closed: ${stockSymbol}`;
                        notifMessage = `${stockSymbol} hit ${targetLabel} at ₹${specificTargetPrice || exitPrice}! Position fully closed.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
                    }
                    else {
                        notifTitle = `🎯 ${targetLabel} Achieved: ${stockSymbol}`;
                        notifMessage = `${stockSymbol} hit ${targetLabel} at ₹${specificTargetPrice || exitPrice}! Book partial profit.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
                    }
                }
                else {
                    notifTitle = isFinalClose ? `🎯 Trade Closed: ${stockSymbol}` : `🎯 Partially Closed: ${stockSymbol}`;
                    notifMessage = `${stockSymbol} ${isFinalClose ? 'fully closed' : 'partially closed'} at ₹${exitPrice}.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
                }
            }
            else if (closeStatus === 'Fully Closed') {
                notifTitle = `🎯 Trade Closed: ${stockSymbol}`;
                notifMessage = `${stockSymbol} trade fully closed at ₹${exitPrice || specificTargetPrice}.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
            }
            else if (closeStatus === 'SL Hit') {
                notifTitle = `🛑 Stoploss Hit: ${stockSymbol}`;
                notifMessage = `Stoploss triggered for ${stockSymbol} at ₹${exitPrice || signal.stoploss}. Exit position immediately.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
            }
            else if (closeStatus === 'Avoid Signal') {
                notifTitle = `⚠️ Trade Avoided: ${stockSymbol}`;
                notifMessage = `Recommendation to avoid ${stockSymbol}.${closeRemark ? ` Remark: ${closeRemark}` : ''}`;
            }
            // Fire-and-forget in background
            setImmediate(async () => {
                try {
                    await (0, notificationService_1.broadcastSignalNotification)({
                        tenantId,
                        planIds: planIdsToNotify,
                        title: notifTitle,
                        message: notifMessage,
                        type: 'update',
                        data: {
                            signalId: id,
                            stockSymbol,
                            segment: signal.segment,
                            callType: signal.callType,
                            entryPrice: signal.entryPrice,
                            entryType: signal.entryType,
                            target1: signal.target1,
                            target2: signal.target2,
                            target3: signal.target3,
                            targetLabel,
                            specificTargetPrice,
                            closedTargetVal: specificTargetPrice ? String(specificTargetPrice) : '',
                            stoploss: signal.stoploss,
                            tradeDuration: signal.tradeDuration,
                            closeStatus,
                            exitPrice,
                            closeRemark,
                            closeTargets,
                            isFinalClose,
                            action: 'TRADE_UPDATE'
                        },
                        adminTitle: `🎯 Trade Status Updated: ${stockSymbol}`,
                        adminMessage: `${researcherName} updated trade ${stockSymbol} to status: ${closeStatus}.${closeRemark ? ` (${closeRemark})` : ''}`
                    });
                }
                catch (notifErr) {
                    console.warn('[Notification] Failed to broadcast closeSignal notification in background:', notifErr);
                }
            });
        }
        catch (notifErr) {
            console.warn('[Notification] Failed to setup closeSignal notification:', notifErr);
        }
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
        const applySignature = req.body.applySignature === 'true';
        const signatureMode = applySignature ? (req.body.signatureMode || 'UPLOAD_SIGN') : 'NONE';
        // If researcher requested signature stamp on uploaded PDF
        if (applySignature && signatureMode === 'UPLOAD_SIGN' && req.file.path) {
            try {
                const userId = req.user.id || req.user._id;
                const userDoc = await db_1.default.User.findById(userId).lean();
                const tenantDoc = await db_1.default.Tenant.findById(tenantId).lean();
                const sigUrl = userDoc?.signatureUrl || tenantDoc?.coSignatureUrl;
                if (sigUrl) {
                    const filePath = req.file.path;
                    const pdfBuffer = fs_1.default.readFileSync(filePath);
                    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer);
                    const pages = pdfDoc.getPages();
                    const lastPage = pages[pages.length - 1];
                    const { width } = lastPage.getSize();
                    const cleanSigPath = sigUrl.replace(/^\/uploads\//, '');
                    const diskPath = path_1.default.join(process.cwd(), 'uploads', cleanSigPath);
                    if (fs_1.default.existsSync(diskPath)) {
                        const imgBytes = fs_1.default.readFileSync(diskPath);
                        let embeddedImg;
                        if (sigUrl.toLowerCase().endsWith('.png')) {
                            embeddedImg = await pdfDoc.embedPng(imgBytes);
                        }
                        else {
                            embeddedImg = await pdfDoc.embedJpg(imgBytes);
                        }
                        const imgDims = embeddedImg.scale(0.25);
                        const boxWidth = Math.min(imgDims.width, 140);
                        const boxHeight = Math.min(imgDims.height, 40);
                        const x = width - boxWidth - 30;
                        const y = 30;
                        lastPage.drawImage(embeddedImg, {
                            x,
                            y,
                            width: boxWidth,
                            height: boxHeight,
                        });
                        const modifiedBytes = await pdfDoc.save();
                        fs_1.default.writeFileSync(filePath, Buffer.from(modifiedBytes));
                    }
                }
            }
            catch (stampErr) {
                console.warn('[uploadReport] Warning: Could not stamp signature image on uploaded PDF:', stampErr);
            }
        }
        const updatedSignal = await db_1.default.Signal.findByIdAndUpdate(id, {
            $set: {
                reportUrl,
                signatureMode,
                signatureMeta: {
                    method: applySignature ? 'UPLOADED_SIGN' : 'NONE',
                    uploadedAt: new Date(),
                    isDigitallySigned: applySignature
                }
            }
        }, { returnDocument: 'after', lean: true });
        // Broadcast report notification to subscribers and Admin
        try {
            const sig = await db_1.default.Signal.findById(id).populate('stockId').lean() || signal;
            const stockSymbol = sig?.stockId?.symbol || sig?.stock?.symbol || 'Trade Signal';
            const user = req.user;
            const researcherName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Researcher';
            await (0, notificationService_1.broadcastSignalNotification)({
                tenantId,
                planIds: [signal.planId],
                title: `📄 Research Report: ${stockSymbol}`,
                message: `New official research report uploaded for ${stockSymbol}. Available in Research Reports.`,
                type: 'report',
                data: {
                    signalId: id,
                    stockSymbol,
                    reportUrl,
                    action: 'REPORT_UPLOADED'
                },
                signalCreatedAt: signal.createdAt,
                adminTitle: `📄 Research Report Uploaded: ${stockSymbol}`,
                adminMessage: `${researcherName} uploaded a research report for ${stockSymbol}.`
            });
        }
        catch (notifErr) {
            console.warn('[Notification] Failed to broadcast uploadReport notification:', notifErr);
        }
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
            .populate('stockId')
            .populate('stock')
            .lean();
        if (signal) {
            const tenantId = req.user.tenantId || signal.tenantId;
            const sig = signal;
            const stock = sig.stockId || sig.stock || {};
            const stockSymbol = stock.symbol || 'Trade Signal';
            const user = req.user;
            const researcherName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Researcher';
            const targetPlanId = signal.planId ? (signal.planId._id?.toString() || signal.planId.toString()) : null;
            try {
                await (0, notificationService_1.broadcastSignalNotification)({
                    tenantId,
                    planIds: targetPlanId ? [targetPlanId] : [],
                    title: `🚨 Trade Alert: ${stockSymbol}`,
                    message: `${message}`,
                    type: 'alert',
                    data: {
                        signalId: id,
                        stockSymbol,
                        segment: signal.segment,
                        callType: signal.callType,
                        entryPrice: signal.entryPrice,
                        alertMessage: message,
                        message: message,
                        action: 'TRADE_ALERT'
                    },
                    adminTitle: `🚨 Trade Alert Sent: ${stockSymbol}`,
                    adminMessage: `${researcherName} sent alert for ${stockSymbol}: ${message}`
                });
            }
            catch (notifErr) {
                console.warn('[Notification] Failed to broadcast alert message:', notifErr);
            }
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
