"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTelegramChannelViaAccountApi = exports.bulkMapTelegramPlansApi = exports.getTelegramPlanMatrixApi = exports.getTelegramAuthStatusApi = exports.disconnectTelegramAccountApi = exports.syncTelegramAccountGroupsApi = exports.verifyTelegramPhoneOtpApi = exports.sendTelegramPhoneOtpApi = exports.generateGroupInviteLinkApi = exports.testTelegramGroupPingApi = exports.autoDetectTelegramGroupsApi = exports.deleteTelegramGroupApi = exports.updateTelegramGroupApi = exports.createTelegramGroupApi = exports.listTelegramGroupsApi = exports.getClientTelegramGroupsApi = exports.testTelegramConnectionApi = exports.updateTelegramSettingsApi = exports.getTelegramSettingsApi = exports.getGroupInviteLinkApi = exports.sendSignalApi = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importStar(require("../config/db"));
const telegramService_1 = __importDefault(require("../services/telegramService"));
const telegramMtprotoService_1 = __importDefault(require("../services/telegramMtprotoService"));
const auditService_1 = require("../services/auditService");
/**
 * Mask sensitive token for secure display in Admin UI
 */
const maskToken = (token) => {
    if (!token || token.length < 8)
        return '****';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
};
/**
 * POST /api/v1/telegram/send-signal
 * Broadcast a new trading signal directly to the Telegram group
 */
const sendSignalApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { symbol, action, entry, entryType, target, target2, target3, stopLoss, stoploss, segment, tradeDuration, expiryDate, strikePrice, optionType, description, chatId, planId } = req.body;
        // Validate required fields
        if (!symbol || !action || entry === undefined || (target === undefined && req.body.target1 === undefined) || (stopLoss === undefined && stoploss === undefined)) {
            return res.status(400).json({
                success: false,
                message: 'Missing required signal fields. Required: symbol, action, entry, target (or target1), stopLoss (or stoploss).'
            });
        }
        let targetChatId = chatId ? String(chatId).trim() : undefined;
        // If planId was passed and targetChatId is not provided, look up plan's mapped telegramChatId!
        if (!targetChatId && planId && db_1.default?.Plan) {
            try {
                const mappedPlan = await db_1.default.Plan.findById(planId).lean();
                if (mappedPlan?.telegramChatId && String(mappedPlan.telegramChatId).trim()) {
                    targetChatId = String(mappedPlan.telegramChatId).trim();
                }
            }
            catch { }
        }
        const payload = {
            symbol: String(symbol).trim(),
            action: String(action).trim(),
            entry: entry,
            entryType: entryType || undefined,
            target: target ?? req.body.target1,
            target2: target2 ?? undefined,
            target3: target3 ?? undefined,
            stopLoss: stopLoss ?? stoploss,
            segment: segment || undefined,
            tradeDuration: tradeDuration || undefined,
            expiryDate: expiryDate || undefined,
            strikePrice: strikePrice || undefined,
            optionType: optionType || undefined,
            description: description || undefined
        };
        const result = await telegramService_1.default.sendSignal(payload, { tenantId, chatId: targetChatId });
        if (!result.success) {
            return res.status(502).json({
                success: false,
                message: result.error || 'Failed to dispatch message to Telegram.',
                error: result.error
            });
        }
        if (req.user?.id) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId: req.user.id,
                action: 'CREATE',
                module: 'RESEARCH',
                newValue: { action: 'TELEGRAM_SIGNAL_SENT', symbol: payload.symbol },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Trading signal sent to Telegram group successfully.',
            data: result.data
        });
    }
    catch (err) {
        console.error('[TelegramController] sendSignalApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.sendSignalApi = sendSignalApi;
/**
 * GET /api/v1/telegram/invite-link
 * Retrieve the Telegram group invite link for clients / users to join
 */
const getGroupInviteLinkApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const result = await telegramService_1.default.getInviteLink({ tenantId });
        if (!result.success) {
            return res.status(200).json({
                success: false,
                message: result.error || 'Telegram invite link is currently unavailable.',
                data: {
                    inviteLink: null,
                    isConfigured: false
                }
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                inviteLink: result.inviteLink,
                isConfigured: true
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] getGroupInviteLinkApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getGroupInviteLinkApi = getGroupInviteLinkApi;
/**
 * GET /api/v1/telegram/settings
 * Admin: Retrieve current Telegram Bot & Group settings and health status
 */
const getTelegramSettingsApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const config = await telegramService_1.default.getConfig(tenantId);
        const isConfigured = telegramService_1.default.isConfigured(config);
        let chatInfo = null;
        let botInfo = null;
        let memberCount = null;
        let connectionError = null;
        if (isConfigured) {
            const infoResult = await telegramService_1.default.getChatInfo({
                tenantId,
                botToken: config.botToken,
                chatId: config.chatId
            });
            if (infoResult.success) {
                chatInfo = infoResult.data?.chat;
                botInfo = infoResult.data?.bot;
                memberCount = infoResult.data?.memberCount;
            }
            else {
                connectionError = infoResult.error || 'Failed to connect to Telegram';
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                isConfigured,
                hasBotToken: Boolean(config.botToken),
                botToken: config.botToken || '',
                botTokenMasked: config.botToken ? maskToken(config.botToken) : '',
                chatId: config.chatId || '',
                inviteLink: config.inviteLink || '',
                bot: botInfo
                    ? {
                        id: botInfo.id,
                        firstName: botInfo.first_name,
                        username: botInfo.username
                    }
                    : null,
                chat: chatInfo
                    ? {
                        id: chatInfo.id,
                        title: chatInfo.title,
                        type: chatInfo.type,
                        username: chatInfo.username,
                        inviteLink: chatInfo.invite_link
                    }
                    : null,
                memberCount,
                connectionError
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] getTelegramSettingsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTelegramSettingsApi = getTelegramSettingsApi;
/**
 * PUT /api/v1/telegram/settings
 * Admin: Update Telegram Bot Token, Chat ID, and Invite Link
 */
const updateTelegramSettingsApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { botToken, chatId, inviteLink } = req.body;
        const updateFields = {};
        if (botToken !== undefined && !botToken.includes('...')) {
            updateFields.telegramBotToken = botToken ? botToken.trim() : null;
        }
        if (chatId !== undefined) {
            updateFields.telegramChatId = chatId ? String(chatId).trim() : null;
        }
        if (inviteLink !== undefined) {
            updateFields.telegramInviteLink = inviteLink ? inviteLink.trim() : null;
        }
        // Update in database
        let targetTenant = null;
        if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            if (db_1.default?.Tenant) {
                targetTenant = await db_1.default.Tenant.findByIdAndUpdate(tenantId, { $set: updateFields }, { returnDocument: 'after' });
            }
            if (!targetTenant && db_1.centralModels?.Tenant) {
                targetTenant = await db_1.centralModels.Tenant.findByIdAndUpdate(tenantId, { $set: updateFields }, { returnDocument: 'after' });
            }
        }
        if (!targetTenant && tenantId) {
            if (db_1.default?.Tenant) {
                targetTenant = await db_1.default.Tenant.findOneAndUpdate({ $or: [{ id: tenantId }, { tenantId: tenantId }] }, { $set: updateFields }, { returnDocument: 'after' });
            }
            if (!targetTenant && db_1.centralModels?.Tenant) {
                targetTenant = await db_1.centralModels.Tenant.findOneAndUpdate({ $or: [{ id: tenantId }, { tenantId: tenantId }] }, { $set: updateFields }, { returnDocument: 'after' });
            }
        }
        if (!targetTenant) {
            if (db_1.default?.Tenant) {
                targetTenant = await db_1.default.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateFields }, { returnDocument: 'after' });
            }
            if (!targetTenant && db_1.centralModels?.Tenant) {
                targetTenant = await db_1.centralModels.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateFields }, { returnDocument: 'after' });
            }
        }
        // Keep process.env updated in memory for real-time reflection
        if (updateFields.telegramBotToken !== undefined) {
            process.env.TELEGRAM_BOT_TOKEN = updateFields.telegramBotToken || '';
        }
        if (updateFields.telegramChatId !== undefined) {
            process.env.TELEGRAM_CHAT_ID = updateFields.telegramChatId || '';
        }
        if (updateFields.telegramInviteLink !== undefined) {
            process.env.TELEGRAM_INVITE_LINK = updateFields.telegramInviteLink || '';
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId: targetTenant?._id || tenantId,
                userId,
                action: 'UPDATE',
                module: 'TENANTS',
                newValue: { action: 'UPDATE_TELEGRAM_SETTINGS', chatId: updateFields.telegramChatId },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Telegram settings saved successfully.',
            data: {
                botToken: updateFields.telegramBotToken !== undefined ? updateFields.telegramBotToken : process.env.TELEGRAM_BOT_TOKEN,
                chatId: updateFields.telegramChatId !== undefined ? updateFields.telegramChatId : process.env.TELEGRAM_CHAT_ID,
                inviteLink: updateFields.telegramInviteLink !== undefined ? updateFields.telegramInviteLink : process.env.TELEGRAM_INVITE_LINK
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] updateTelegramSettingsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateTelegramSettingsApi = updateTelegramSettingsApi;
/**
 * POST /api/v1/telegram/test-connection
 * Admin: Test Telegram credentials and send a verification test ping
 */
const testTelegramConnectionApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { botToken, chatId } = req.body;
        const result = await telegramService_1.default.testConnection(botToken, chatId, tenantId);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'Telegram connection test failed. Please verify Bot Token, Chat ID and permissions.',
                error: result.error
            });
        }
        return res.status(200).json({
            success: true,
            message: result.message || 'Telegram Bot connected successfully! Test message sent to group.',
            data: {
                bot: result.bot,
                chat: result.chat
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] testTelegramConnectionApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.testTelegramConnectionApi = testTelegramConnectionApi;
/**
 * GET /api/v1/client/telegram/groups
 * Client: Retrieve the specific Telegram bot groups corresponding to the client's active plan subscriptions
 */
const getClientTelegramGroupsApi = async (req, res) => {
    try {
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized client session.' });
        }
        // 1. Resolve client profile
        let client = null;
        if (db_1.default?.Client) {
            client = await db_1.default.Client.findOne({ userId }).lean();
            if (!client) {
                client = await db_1.default.Client.findById(userId).lean();
            }
        }
        const clientId = client ? (client._id || client.id) : userId;
        // 2. Fetch all active subscriptions for this client
        const activeSubs = db_1.default?.Subscription
            ? await db_1.default.Subscription.find({
                $or: [{ clientId }, { clientId: userId }],
                status: 'ACTIVE'
            })
                .populate('planId')
                .sort({ createdAt: -1 })
                .lean()
            : [];
        const tenantConfig = await telegramService_1.default.getConfig(tenantId);
        const isBotConfigured = telegramService_1.default.isConfigured(tenantConfig);
        // 3. For each active subscription, resolve its specific Telegram group & invite link
        const planGroupMap = new Map();
        for (const sub of activeSubs) {
            let planObj = sub.planId;
            if (planObj && typeof planObj !== 'object' && db_1.default?.Plan) {
                planObj = await db_1.default.Plan.findById(planObj).lean();
            }
            if (!planObj)
                continue;
            const planIdStr = String(planObj._id || planObj.id);
            if (planGroupMap.has(planIdStr))
                continue;
            const targetChatId = planObj.telegramChatId ? String(planObj.telegramChatId).trim() : tenantConfig.chatId;
            let targetInviteLink = planObj.telegramInviteLink ? String(planObj.telegramInviteLink).trim() : '';
            // If no custom invite link is stored, dynamically resolve or export invite link
            if (!targetInviteLink && targetChatId && tenantConfig.botToken) {
                const linkRes = await telegramService_1.default.getInviteLink({
                    tenantId,
                    botToken: tenantConfig.botToken,
                    chatId: targetChatId,
                    name: `${planObj.name || 'Advisory'} Signal Channel`
                });
                if (linkRes.success && linkRes.inviteLink) {
                    targetInviteLink = linkRes.inviteLink;
                }
            }
            // Fallback to tenant default invite link
            if (!targetInviteLink && tenantConfig.inviteLink) {
                targetInviteLink = tenantConfig.inviteLink;
            }
            planGroupMap.set(planIdStr, {
                planId: planIdStr,
                planName: planObj.name || 'Active Plan',
                description: planObj.description || '',
                price: planObj.price,
                durationMonths: planObj.durationMonths,
                researchSegments: planObj.researchSegments || 'EQUITY',
                telegramChatId: targetChatId || null,
                telegramInviteLink: targetInviteLink || null,
                telegramGroupName: planObj.telegramGroupName || `${planObj.name} Official Signals`,
                subscriptionId: String(sub._id || sub.id),
                subscriptionStatus: sub.status,
                startDate: sub.startDate,
                endDate: sub.endDate,
                isConfigured: Boolean(targetChatId || targetInviteLink || isBotConfigured)
            });
        }
        const subscribedGroups = Array.from(planGroupMap.values());
        const hasActiveSubscription = subscribedGroups.length > 0;
        // Default tenant invite link fallback if client has active subscription but no separate group
        let defaultInviteLink = tenantConfig.inviteLink || '';
        if (!defaultInviteLink && tenantConfig.chatId && tenantConfig.botToken) {
            const defaultRes = await telegramService_1.default.getInviteLink({ tenantId });
            if (defaultRes.success && defaultRes.inviteLink) {
                defaultInviteLink = defaultRes.inviteLink;
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                hasActiveSubscription,
                subscribedGroups,
                defaultInviteLink: defaultInviteLink || null,
                isBotConfigured,
                botUsername: tenantConfig.botToken ? 'Complince_signal_bot' : null
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] getClientTelegramGroupsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getClientTelegramGroupsApi = getClientTelegramGroupsApi;
/**
 * GET /api/v1/telegram/groups
 * Admin/Researcher: List all dynamic Telegram groups registered for this tenant
 */
const listTelegramGroupsApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        let query = { deletedAt: null };
        if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            query.tenantId = new mongoose_1.default.Types.ObjectId(tenantId);
        }
        let groups = [];
        if (db_1.default?.TelegramGroup) {
            groups = await db_1.default.TelegramGroup.find(query).sort({ isDefault: -1, createdAt: -1 }).lean();
        }
        // If no groups exist yet in TelegramGroup collection, check if tenant has a primary telegramChatId configured
        // and provide it seamlessly as the primary group
        const tenantConfig = await telegramService_1.default.getConfig(tenantId);
        if (groups.length === 0 && tenantConfig.chatId) {
            // Auto-create initial group record in DB if possible
            try {
                if (db_1.default?.TelegramGroup && tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                    const autoGroup = await db_1.default.TelegramGroup.create({
                        tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                        name: 'Primary Telegram Group',
                        chatId: tenantConfig.chatId,
                        inviteLink: tenantConfig.inviteLink || null,
                        type: 'supergroup',
                        isDefault: true,
                        status: 'ACTIVE',
                        createdById: req.user?.id ? new mongoose_1.default.Types.ObjectId(req.user.id) : null
                    });
                    groups = [autoGroup.toObject ? autoGroup.toObject() : autoGroup];
                }
            }
            catch (seedErr) {
                console.warn('[TelegramController] Could not auto-seed primary group:', seedErr.message);
            }
        }
        return res.status(200).json({
            success: true,
            data: groups,
            total: groups.length
        });
    }
    catch (err) {
        console.error('[TelegramController] listTelegramGroupsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.listTelegramGroupsApi = listTelegramGroupsApi;
/**
 * POST /api/v1/telegram/groups
 * Admin: Add a new dynamic Telegram group with verification and auto invite link generation
 */
const createTelegramGroupApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { name, chatId, inviteLink, type, isDefault, status, assignedPlanId } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({
                success: false,
                message: 'Group / Channel Name is required.'
            });
        }
        const nameClean = String(name).trim();
        let chatIdClean = chatId ? String(chatId).trim() : '';
        // If chatId was not provided, auto-resolve or generate a unique identifier
        if (!chatIdClean) {
            if (inviteLink && String(inviteLink).includes('t.me/')) {
                const usernameMatch = String(inviteLink).split('t.me/')[1]?.replace(/[^a-zA-Z0-9_]/g, '');
                if (usernameMatch && !usernameMatch.startsWith('+')) {
                    chatIdClean = `@${usernameMatch}`;
                }
            }
            if (!chatIdClean) {
                // Generate clean group identifier
                chatIdClean = `@${nameClean.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
            }
        }
        // Check if group with this chatId already exists for this tenant
        const existing = await db_1.default.TelegramGroup.findOne({
            tenantId,
            chatId: chatIdClean,
            deletedAt: null
        }).lean();
        let savedGroup = null;
        if (existing) {
            savedGroup = existing;
        }
        else {
            // Try to automatically query Telegram for chat metadata and invite link if not provided
            let finalInviteLink = inviteLink ? String(inviteLink).trim() : null;
            let groupType = type || 'supergroup';
            let groupUsername = null;
            let memberCount = 0;
            try {
                const metaResult = await telegramService_1.default.getChatMetadataAndInvite(chatIdClean, { tenantId });
                if (metaResult.success && metaResult.data) {
                    if (!finalInviteLink && metaResult.data.inviteLink) {
                        finalInviteLink = metaResult.data.inviteLink;
                    }
                    if (metaResult.data.type)
                        groupType = metaResult.data.type;
                    if (metaResult.data.username)
                        groupUsername = metaResult.data.username;
                    if (metaResult.data.memberCount)
                        memberCount = metaResult.data.memberCount;
                }
            }
            catch { }
            // If isDefault is true, unset default on other groups
            if (isDefault) {
                await db_1.default.TelegramGroup.updateMany({ tenantId, deletedAt: null }, { $set: { isDefault: false } });
            }
            savedGroup = await db_1.default.TelegramGroup.create({
                tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                name: nameClean,
                chatId: chatIdClean,
                inviteLink: finalInviteLink,
                type: groupType,
                username: groupUsername,
                memberCount,
                isDefault: Boolean(isDefault),
                status: status || 'ACTIVE',
                createdById: userId ? new mongoose_1.default.Types.ObjectId(userId) : null
            });
        }
        // If assignedPlanId is provided, immediately map this plan to the group!
        if (assignedPlanId && db_1.default?.Plan) {
            try {
                await db_1.default.Plan.findByIdAndUpdate(assignedPlanId, {
                    $set: {
                        telegramChatId: savedGroup.chatId,
                        telegramGroupName: savedGroup.name,
                        telegramInviteLink: savedGroup.inviteLink || null
                    }
                });
            }
            catch (planErr) {
                console.warn('[TelegramController] Could not auto-map group to plan:', planErr.message);
            }
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'CREATE',
                module: 'SETTINGS',
                newValue: { action: 'CREATE_TELEGRAM_GROUP', groupName: nameClean, chatId: chatIdClean, planId: assignedPlanId },
                ipAddress: req.ip
            });
        }
        return res.status(201).json({
            success: true,
            message: `Telegram group "${nameClean}" registered and linked successfully!`,
            data: savedGroup
        });
    }
    catch (err) {
        console.error('[TelegramController] createTelegramGroupApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createTelegramGroupApi = createTelegramGroupApi;
/**
 * PUT /api/v1/telegram/groups/:id
 * Admin: Update dynamic Telegram group
 */
const updateTelegramGroupApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { id } = req.params;
        const { name, chatId, inviteLink, type, isDefault, status } = req.body;
        const group = await db_1.default.TelegramGroup.findById(id);
        if (!group || group.deletedAt) {
            return res.status(404).json({ success: false, message: 'Telegram group not found.' });
        }
        if (isDefault && !group.isDefault) {
            await db_1.default.TelegramGroup.updateMany({ tenantId, _id: { $ne: group._id }, deletedAt: null }, { $set: { isDefault: false } });
        }
        if (name !== undefined)
            group.name = String(name).trim();
        if (chatId !== undefined)
            group.chatId = String(chatId).trim();
        if (inviteLink !== undefined)
            group.inviteLink = inviteLink ? String(inviteLink).trim() : null;
        if (type !== undefined)
            group.type = type;
        if (isDefault !== undefined)
            group.isDefault = Boolean(isDefault);
        if (status !== undefined)
            group.status = status;
        await group.save();
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'UPDATE',
                module: 'SETTINGS',
                newValue: { action: 'UPDATE_TELEGRAM_GROUP', groupId: id, name: group.name },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: `Telegram group "${group.name}" updated successfully.`,
            data: group
        });
    }
    catch (err) {
        console.error('[TelegramController] updateTelegramGroupApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateTelegramGroupApi = updateTelegramGroupApi;
/**
 * DELETE /api/v1/telegram/groups/:id
 * Admin: Delete dynamic Telegram group
 */
const deleteTelegramGroupApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { id } = req.params;
        const group = await db_1.default.TelegramGroup.findById(id);
        if (!group || group.deletedAt) {
            return res.status(404).json({ success: false, message: 'Telegram group not found.' });
        }
        group.deletedAt = new Date();
        await group.save();
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'DELETE',
                module: 'SETTINGS',
                newValue: { action: 'DELETE_TELEGRAM_GROUP', groupId: id, name: group.name },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: `Telegram group "${group.name}" deleted successfully.`
        });
    }
    catch (err) {
        console.error('[TelegramController] deleteTelegramGroupApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteTelegramGroupApi = deleteTelegramGroupApi;
/**
 * POST /api/v1/telegram/groups/auto-detect
 * Admin: Scan recent Telegram bot updates to auto-discover channels and groups
 */
const autoDetectTelegramGroupsApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { autoImport } = req.body;
        const result = await telegramService_1.default.detectGroupsFromUpdates({ tenantId });
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to detect Telegram groups. Please ensure bot token is configured and bot has been added to the groups.',
                error: result.error
            });
        }
        const detected = result.detectedGroups || [];
        // Fetch existing registered groups
        const existingGroups = await db_1.default.TelegramGroup.find({ tenantId, deletedAt: null }).lean();
        const existingChatIds = new Set(existingGroups.map((g) => String(g.chatId)));
        const categorized = detected.map(g => ({
            ...g,
            isAlreadyRegistered: existingChatIds.has(String(g.chatId))
        }));
        // If autoImport requested, insert new groups directly
        let importedCount = 0;
        if (autoImport && db_1.default?.TelegramGroup) {
            for (const group of categorized) {
                if (!group.isAlreadyRegistered) {
                    await db_1.default.TelegramGroup.create({
                        tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                        name: group.name,
                        chatId: group.chatId,
                        inviteLink: group.inviteLink || null,
                        type: group.type || 'supergroup',
                        username: group.username || null,
                        memberCount: group.memberCount || 0,
                        isDefault: existingGroups.length === 0 && importedCount === 0,
                        status: 'ACTIVE',
                        createdById: req.user?.id ? new mongoose_1.default.Types.ObjectId(req.user.id) : null
                    });
                    importedCount++;
                }
            }
        }
        return res.status(200).json({
            success: true,
            message: `Found ${detected.length} group(s)/channel(s)${autoImport ? `. Imported ${importedCount} new group(s).` : '.'}`,
            data: {
                bot: result.bot,
                detectedGroups: categorized,
                totalDetected: detected.length,
                importedCount
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] autoDetectTelegramGroupsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.autoDetectTelegramGroupsApi = autoDetectTelegramGroupsApi;
/**
 * POST /api/v1/telegram/groups/:id/test
 * Admin: Send a test ping to a specific registered Telegram group
 */
const testTelegramGroupPingApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { id } = req.params;
        const group = await db_1.default.TelegramGroup.findById(id);
        if (!group || group.deletedAt) {
            return res.status(404).json({ success: false, message: 'Telegram group not found.' });
        }
        const testMsg = [
            '🤖 <b>TELEGRAM GROUP VERIFICATION</b>\n',
            `✅ <b>Status:</b> Dynamic Group Active & Verified`,
            `🏷️ <b>Group Name:</b> ${group.name}`,
            `🆔 <b>Chat ID:</b> <code>${group.chatId}</code>`,
            `⏰ <b>Timestamp:</b> ${telegramService_1.default.formatTimeIST()}`,
            '\n<i>This Telegram group is ready to receive trading signals for its assigned subscription plans!</i>'
        ].join('\n');
        const sendRes = await telegramService_1.default.sendMessage(testMsg, {
            chatId: group.chatId,
            tenantId
        });
        if (!sendRes.success) {
            return res.status(400).json({
                success: false,
                message: sendRes.error || 'Failed to send test message to this group. Ensure bot is an admin with post permissions.',
                error: sendRes.error
            });
        }
        return res.status(200).json({
            success: true,
            message: `Test ping sent successfully to "${group.name}"!`,
            data: sendRes.data
        });
    }
    catch (err) {
        console.error('[TelegramController] testTelegramGroupPingApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.testTelegramGroupPingApi = testTelegramGroupPingApi;
/**
 * POST /api/v1/telegram/groups/:id/generate-invite
 * Admin: Generate or refresh the invite link for a specific registered group
 */
const generateGroupInviteLinkApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { id } = req.params;
        const group = await db_1.default.TelegramGroup.findById(id);
        if (!group || group.deletedAt) {
            return res.status(404).json({ success: false, message: 'Telegram group not found.' });
        }
        const linkRes = await telegramService_1.default.getInviteLink({
            tenantId,
            chatId: group.chatId,
            name: `${group.name} Signal Invite`
        });
        if (!linkRes.success || !linkRes.inviteLink) {
            return res.status(400).json({
                success: false,
                message: linkRes.error || 'Could not generate invite link. Ensure bot has admin permissions in the group.',
                error: linkRes.error
            });
        }
        group.inviteLink = linkRes.inviteLink;
        await group.save();
        return res.status(200).json({
            success: true,
            message: 'Invite link generated and saved successfully!',
            data: {
                inviteLink: linkRes.inviteLink
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] generateGroupInviteLinkApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.generateGroupInviteLinkApi = generateGroupInviteLinkApi;
/**
 * POST /api/v1/telegram/auth/send-code
 * Admin: Send Telegram Login OTP code to Phone Number via MTProto
 */
const sendTelegramPhoneOtpApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const { phoneNumber } = req.body;
        if (!phoneNumber || !String(phoneNumber).trim()) {
            return res.status(400).json({ success: false, message: 'Phone number is required.' });
        }
        const result = await telegramMtprotoService_1.default.sendPhoneCode(phoneNumber, tenantId);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to send Telegram OTP code to phone number.',
                error: result.error
            });
        }
        return res.status(200).json({
            success: true,
            message: `Telegram OTP code sent to ${result.phoneNumber}. Please check your Telegram app or SMS.`,
            data: {
                phoneNumber: result.phoneNumber,
                phoneCodeHash: result.phoneCodeHash
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] sendTelegramPhoneOtpApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.sendTelegramPhoneOtpApi = sendTelegramPhoneOtpApi;
/**
 * POST /api/v1/telegram/auth/verify-code
 * Admin: Verify Telegram OTP & 2FA Password, connect account and auto-sync groups
 */
const verifyTelegramPhoneOtpApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { phoneNumber, phoneCode, phoneCodeHash, password } = req.body;
        if (!phoneNumber || !phoneCode) {
            return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
        }
        const result = await telegramMtprotoService_1.default.verifyPhoneCode({
            phoneNumberRaw: phoneNumber,
            phoneCode,
            phoneCodeHash,
            password,
            tenantId,
            userId
        });
        if (!result.success) {
            const is2FA = result.error?.includes('2FA_PASSWORD_REQUIRED');
            return res.status(400).json({
                success: false,
                is2faRequired: is2FA,
                message: result.error || 'Telegram verification failed.',
                error: result.error
            });
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'UPDATE',
                module: 'SETTINGS',
                newValue: {
                    action: 'CONNECT_TELEGRAM_PHONE_ACCOUNT',
                    phone: result.user?.phone,
                    username: result.user?.username
                },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: `Telegram account connected successfully! Synced ${result.syncedGroupsCount || 0} channels & groups.`,
            data: {
                user: result.user,
                syncedGroupsCount: result.syncedGroupsCount || 0
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] verifyTelegramPhoneOtpApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.verifyTelegramPhoneOtpApi = verifyTelegramPhoneOtpApi;
/**
 * POST /api/v1/telegram/auth/sync-groups
 * Admin: Manually trigger re-sync of all channels & groups from connected Telegram account
 */
const syncTelegramAccountGroupsApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant context required.' });
        }
        const result = await telegramMtprotoService_1.default.syncTenantGroups(tenantId, userId);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to sync groups from Telegram session.',
                error: result.error
            });
        }
        return res.status(200).json({
            success: true,
            message: `Successfully synchronized ${result.syncedCount} channels/groups from your Telegram account!`,
            data: {
                syncedCount: result.syncedCount,
                groups: result.groups
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] syncTelegramAccountGroupsApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.syncTelegramAccountGroupsApi = syncTelegramAccountGroupsApi;
/**
 * POST /api/v1/telegram/auth/disconnect
 * Admin: Disconnect Telegram phone account session
 */
const disconnectTelegramAccountApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant context required.' });
        }
        const result = await telegramMtprotoService_1.default.disconnect(tenantId);
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error || 'Failed to disconnect session.' });
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'UPDATE',
                module: 'SETTINGS',
                newValue: { action: 'DISCONNECT_TELEGRAM_PHONE_ACCOUNT' },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Telegram phone account disconnected successfully.'
        });
    }
    catch (err) {
        console.error('[TelegramController] disconnectTelegramAccountApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.disconnectTelegramAccountApi = disconnectTelegramAccountApi;
/**
 * GET /api/v1/telegram/auth/status
 * Admin: Get Telegram Phone Account Connection Status
 */
const getTelegramAuthStatusApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const status = await telegramMtprotoService_1.default.getAuthStatus(tenantId);
        return res.status(200).json({
            success: true,
            data: status
        });
    }
    catch (err) {
        console.error('[TelegramController] getTelegramAuthStatusApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTelegramAuthStatusApi = getTelegramAuthStatusApi;
/**
 * GET /api/v1/telegram/plans/matrix
 * Admin: Retrieve Multi-Plan Group Mapping Matrix (All Plans with assigned Telegram Groups & Stats)
 */
const getTelegramPlanMatrixApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const query = { deletedAt: null };
        if (tenantId && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
            query.tenantId = new mongoose_1.default.Types.ObjectId(tenantId);
        }
        // 1. Fetch plans
        const plans = db_1.default?.Plan
            ? await db_1.default.Plan.find(query).sort({ price: 1, name: 1 }).lean()
            : [];
        // 2. Fetch registered telegram groups
        const groups = db_1.default?.TelegramGroup
            ? await db_1.default.TelegramGroup.find({ ...query, status: 'ACTIVE' }).lean()
            : [];
        const groupMap = new Map(groups.map((g) => [String(g.chatId), g]));
        // 3. Count active subscribers per plan
        const subCounts = {};
        if (db_1.default?.Subscription) {
            try {
                const counts = await db_1.default.Subscription.aggregate([
                    { $match: { status: 'ACTIVE', deletedAt: null } },
                    { $group: { _id: '$planId', count: { $sum: 1 } } }
                ]);
                counts.forEach((c) => {
                    if (c._id)
                        subCounts[String(c._id)] = c.count;
                });
            }
            catch { }
        }
        // 4. Default tenant settings
        const config = await telegramService_1.default.getConfig(tenantId);
        const isBotConfigured = telegramService_1.default.isConfigured(config);
        const matrix = plans.map((p) => {
            const planIdStr = String(p._id || p.id);
            const mappedChatId = p.telegramChatId ? String(p.telegramChatId).trim() : null;
            const mappedGroup = mappedChatId ? groupMap.get(mappedChatId) : null;
            return {
                planId: planIdStr,
                name: p.name,
                price: p.price,
                durationMonths: p.durationMonths,
                researchSegments: p.researchSegments,
                status: p.status,
                telegramChatId: mappedChatId || config.chatId || null,
                telegramGroupName: p.telegramGroupName || (mappedGroup ? mappedGroup.name : null),
                telegramInviteLink: p.telegramInviteLink || (mappedGroup ? mappedGroup.inviteLink : null) || config.inviteLink || null,
                isCustomMapped: Boolean(mappedChatId && mappedChatId !== config.chatId),
                groupType: mappedGroup?.type || 'supergroup',
                activeSubscribers: subCounts[planIdStr] || 0
            };
        });
        return res.status(200).json({
            success: true,
            data: {
                plans: matrix,
                groups,
                defaultGroup: {
                    chatId: config.chatId,
                    inviteLink: config.inviteLink
                },
                isBotConfigured
            }
        });
    }
    catch (err) {
        console.error('[TelegramController] getTelegramPlanMatrixApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTelegramPlanMatrixApi = getTelegramPlanMatrixApi;
/**
 * POST /api/v1/telegram/plans/bulk-map
 * Admin: Save multi-group plan mapping allocations in bulk
 */
const bulkMapTelegramPlansApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { mappings } = req.body; // Array of { planId, telegramChatId, telegramGroupName, telegramInviteLink }
        if (!Array.isArray(mappings) || mappings.length === 0) {
            return res.status(400).json({ success: false, message: 'Mappings array is required.' });
        }
        let updatedCount = 0;
        for (const item of mappings) {
            if (!item.planId)
                continue;
            const updateData = {
                telegramChatId: item.telegramChatId ? String(item.telegramChatId).trim() : null,
                telegramGroupName: item.telegramGroupName ? String(item.telegramGroupName).trim() : null,
                telegramInviteLink: item.telegramInviteLink ? String(item.telegramInviteLink).trim() : null
            };
            // If invite link is empty but chatId is set, try to auto-generate invite link via Bot API
            if (!updateData.telegramInviteLink && updateData.telegramChatId) {
                try {
                    const genRes = await telegramService_1.default.getInviteLink({
                        tenantId,
                        chatId: updateData.telegramChatId,
                        name: `${item.telegramGroupName || 'Plan'} Signals`
                    });
                    if (genRes.success && genRes.inviteLink) {
                        updateData.telegramInviteLink = genRes.inviteLink;
                    }
                }
                catch { }
            }
            if (db_1.default?.Plan) {
                await db_1.default.Plan.findByIdAndUpdate(item.planId, { $set: updateData });
                updatedCount++;
            }
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'UPDATE',
                module: 'PLANS',
                newValue: { action: 'BULK_UPDATE_TELEGRAM_PLAN_MAPPINGS', count: updatedCount },
                ipAddress: req.ip
            });
        }
        return res.status(200).json({
            success: true,
            message: `Successfully updated Telegram group mappings for ${updatedCount} plan(s)!`,
            data: { updatedCount }
        });
    }
    catch (err) {
        console.error('[TelegramController] bulkMapTelegramPlansApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.bulkMapTelegramPlansApi = bulkMapTelegramPlansApi;
/**
 * POST /api/v1/telegram/auth/create-channel
 * Admin: Create a brand new Telegram Broadcast Channel / Supergroup directly on Admin's Telegram Account!
 */
const createTelegramChannelViaAccountApi = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        const { title, about, isBroadcast, assignedPlanId } = req.body;
        if (!title || !String(title).trim()) {
            return res.status(400).json({ success: false, message: 'Channel title is required.' });
        }
        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant context required.' });
        }
        const result = await telegramMtprotoService_1.default.createChannelOnAccount({
            tenantId,
            title: String(title).trim(),
            about: about ? String(about).trim() : undefined,
            isBroadcast: isBroadcast !== false,
            assignedPlanId: assignedPlanId || undefined,
            userId
        });
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error || 'Failed to create channel on Telegram account.',
                error: result.error
            });
        }
        if (userId) {
            await (0, auditService_1.logAudit)({
                tenantId,
                userId,
                action: 'CREATE',
                module: 'SETTINGS',
                newValue: {
                    action: 'CREATE_TELEGRAM_CHANNEL_ON_ACCOUNT',
                    title: result.channel?.title,
                    chatId: result.channel?.id,
                    planId: assignedPlanId
                },
                ipAddress: req.ip
            });
        }
        return res.status(201).json({
            success: true,
            message: `Telegram channel "${result.channel?.title}" created on your account and linked successfully!`,
            data: result
        });
    }
    catch (err) {
        console.error('[TelegramController] createTelegramChannelViaAccountApi error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.createTelegramChannelViaAccountApi = createTelegramChannelViaAccountApi;
