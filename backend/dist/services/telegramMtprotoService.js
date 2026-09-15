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
exports.telegramMtprotoService = exports.TelegramMtprotoService = void 0;
const telegram_1 = require("telegram");
const sessions_1 = require("telegram/sessions");
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importStar(require("../config/db"));
const telegramService_1 = __importDefault(require("./telegramService"));
// Standard Telegram API credentials (can be overridden via environment or tenant settings)
// Reference public registered app credentials for Telegram Desktop/Web
const DEFAULT_API_ID = Number(process.env.TELEGRAM_API_ID || '2040');
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';
class TelegramMtprotoService {
    static instance;
    pendingAuthMap = new Map(); // Key: normalized phoneNumber
    static getInstance() {
        if (!TelegramMtprotoService.instance) {
            TelegramMtprotoService.instance = new TelegramMtprotoService();
        }
        return TelegramMtprotoService.instance;
    }
    /**
     * Helper to normalize phone number to E.164 format (+919876543210)
     */
    normalizePhoneNumber(phone) {
        let clean = phone.replace(/[^\d+]/g, '').trim();
        if (!clean.startsWith('+')) {
            // If 10 digits Indian number, add +91
            if (clean.length === 10) {
                clean = `+91${clean}`;
            }
            else {
                clean = `+${clean}`;
            }
        }
        return clean;
    }
    /**
     * Resolve API credentials for tenant
     */
    async getApiCredentials(tenantId) {
        let apiId = DEFAULT_API_ID;
        let apiHash = DEFAULT_API_HASH;
        if (tenantId) {
            try {
                let tenant = null;
                if (db_1.default?.Tenant) {
                    tenant = await db_1.default.Tenant.findById(tenantId).lean();
                    if (!tenant) {
                        tenant = await db_1.default.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
                    }
                }
                if (!tenant && db_1.centralModels?.Tenant) {
                    tenant = await db_1.centralModels.Tenant.findById(tenantId).lean();
                }
                if (tenant?.telegramApiId)
                    apiId = Number(tenant.telegramApiId);
                if (tenant?.telegramApiHash)
                    apiHash = String(tenant.telegramApiHash).trim();
            }
            catch (err) {
                console.warn('[TelegramMtprotoService] Error reading custom tenant api credentials:', err.message);
            }
        }
        return { apiId, apiHash };
    }
    /**
     * STEP 1: Send Telegram Login OTP code to Admin Phone Number
     */
    async sendPhoneCode(phoneNumberRaw, tenantId) {
        const phoneNumber = this.normalizePhoneNumber(phoneNumberRaw);
        try {
            const { apiId, apiHash } = await this.getApiCredentials(tenantId);
            // Clean up previous pending auth if any
            const existing = this.pendingAuthMap.get(phoneNumber);
            if (existing) {
                try {
                    await existing.client.disconnect();
                }
                catch { }
                this.pendingAuthMap.delete(phoneNumber);
            }
            const stringSession = new sessions_1.StringSession('');
            const client = new telegram_1.TelegramClient(stringSession, apiId, apiHash, {
                connectionRetries: 5,
                useWSS: false,
                deviceModel: 'RA SEBI Compliance Portal',
                appVersion: '1.0.0',
                systemVersion: 'Web'
            });
            await client.connect();
            const sendResult = await client.sendCode({
                apiId,
                apiHash
            }, phoneNumber);
            const phoneCodeHash = sendResult.phoneCodeHash;
            // Store in pending map with 10-minute expiry
            this.pendingAuthMap.set(phoneNumber, {
                client,
                phoneCodeHash,
                phoneNumber,
                apiId,
                apiHash,
                createdAt: Date.now()
            });
            // Set timeout cleanup
            setTimeout(() => {
                const item = this.pendingAuthMap.get(phoneNumber);
                if (item && Date.now() - item.createdAt > 600000) {
                    try {
                        item.client.disconnect();
                    }
                    catch { }
                    this.pendingAuthMap.delete(phoneNumber);
                }
            }, 600000);
            return {
                success: true,
                phoneCodeHash,
                phoneNumber
            };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] sendPhoneCode error:', err);
            const errMsg = err?.errorMessage || err?.message || 'Failed to send Telegram OTP';
            return { success: false, error: errMsg };
        }
    }
    /**
     * STEP 2: Verify Telegram OTP & 2FA Password, Save Session & Sync Groups
     */
    async verifyPhoneCode(options) {
        const phoneNumber = this.normalizePhoneNumber(options.phoneNumberRaw);
        const { phoneCode, phoneCodeHash, password, tenantId, userId } = options;
        let pending = this.pendingAuthMap.get(phoneNumber);
        let client;
        let apiId = DEFAULT_API_ID;
        let apiHash = DEFAULT_API_HASH;
        try {
            if (pending) {
                client = pending.client;
                apiId = pending.apiId;
                apiHash = pending.apiHash;
            }
            else {
                const creds = await this.getApiCredentials(tenantId);
                apiId = creds.apiId;
                apiHash = creds.apiHash;
                client = new telegram_1.TelegramClient(new sessions_1.StringSession(''), apiId, apiHash, {
                    connectionRetries: 5,
                    deviceModel: 'RA SEBI Compliance Portal'
                });
                await client.connect();
            }
            // Perform sign in
            let loggedUser = null;
            try {
                loggedUser = await client.signInUser({
                    apiId,
                    apiHash
                }, {
                    phoneNumber,
                    phoneCode: async () => phoneCode.trim(),
                    password: password ? async () => password : undefined,
                    onError: (err) => {
                        throw err;
                    }
                });
            }
            catch (signInErr) {
                // Check if 2FA password is required
                if (signInErr?.errorMessage === 'SESSION_PASSWORD_NEEDED' || signInErr?.message?.includes('2FA') || signInErr?.message?.includes('PASSWORD')) {
                    if (!password) {
                        return {
                            success: false,
                            error: '2FA_PASSWORD_REQUIRED: Two-Step Verification Password is required for this Telegram account.'
                        };
                    }
                }
                throw signInErr;
            }
            // Export session string
            const sessionString = client.session.save();
            // Extract user info
            const me = await client.getMe();
            const telegramUserInfo = {
                id: String(me?.id || loggedUser?.id || ''),
                firstName: me?.firstName || loggedUser?.firstName || 'Telegram Admin',
                lastName: me?.lastName || loggedUser?.lastName || '',
                username: me?.username || loggedUser?.username || null,
                phone: me?.phone || phoneNumber
            };
            // Save into Tenant document
            const updateData = {
                telegramPhone: phoneNumber,
                telegramSession: sessionString,
                telegramUser: telegramUserInfo
            };
            let updated = false;
            if (tenantId) {
                if (db_1.default?.Tenant && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                    const res = await db_1.default.Tenant.findByIdAndUpdate(tenantId, { $set: updateData }, { returnDocument: 'after' });
                    if (res)
                        updated = true;
                }
                if (!updated && db_1.default?.Tenant) {
                    const res = await db_1.default.Tenant.findOneAndUpdate({ $or: [{ id: tenantId }, { tenantId: tenantId }] }, { $set: updateData }, { returnDocument: 'after' });
                    if (res)
                        updated = true;
                }
                if (db_1.centralModels?.Tenant && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                    await db_1.centralModels.Tenant.findByIdAndUpdate(tenantId, { $set: updateData });
                }
            }
            if (!updated) {
                if (db_1.default?.Tenant) {
                    await db_1.default.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateData }, { returnDocument: 'after' });
                }
                if (db_1.centralModels?.Tenant) {
                    await db_1.centralModels.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateData }, { returnDocument: 'after' });
                }
            }
            // Clean up in-memory pending auth
            this.pendingAuthMap.delete(phoneNumber);
            // Automatically sync admin channels/groups into system
            let syncedCount = 0;
            if (tenantId) {
                try {
                    const syncResult = await this.syncUserGroupsWithClient(client, tenantId, userId);
                    syncedCount = syncResult.syncedCount;
                }
                catch (syncErr) {
                    console.warn('[TelegramMtprotoService] Initial group sync warning:', syncErr.message);
                }
            }
            return {
                success: true,
                user: telegramUserInfo,
                sessionString,
                syncedGroupsCount: syncedCount
            };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] verifyPhoneCode error:', err);
            const errMsg = err?.errorMessage || err?.message || 'Verification failed';
            return { success: false, error: errMsg };
        }
    }
    /**
     * Helper to retrieve tenant document reliably with fallbacks
     */
    async getTenantRecord(tenantId) {
        let tenant = null;
        if (tenantId && db_1.default?.Tenant) {
            try {
                if (mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                    tenant = await db_1.default.Tenant.findById(tenantId).lean();
                }
            }
            catch { }
            if (!tenant) {
                try {
                    tenant = await db_1.default.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
                }
                catch { }
            }
        }
        if (!tenant && tenantId && db_1.centralModels?.Tenant) {
            try {
                if (mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                    tenant = await db_1.centralModels.Tenant.findById(tenantId).lean();
                }
            }
            catch { }
        }
        // If not found or tenant doesn't have telegramSession, check if any tenant document has telegramSession
        if (!tenant || !tenant.telegramSession) {
            if (db_1.default?.Tenant) {
                const withSession = await db_1.default.Tenant.findOne({ telegramSession: { $exists: true, $ne: null } }).lean();
                if (withSession)
                    tenant = withSession;
            }
        }
        if (!tenant || !tenant.telegramSession) {
            if (db_1.centralModels?.Tenant) {
                const withSession = await db_1.centralModels.Tenant.findOne({ telegramSession: { $exists: true, $ne: null } }).lean();
                if (withSession)
                    tenant = withSession;
            }
        }
        if (!tenant) {
            if (db_1.default?.Tenant)
                tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
            if (!tenant && db_1.centralModels?.Tenant)
                tenant = await db_1.centralModels.Tenant.findOne({ deletedAt: null }).lean();
        }
        return tenant;
    }
    /**
     * Helper to initialize connected client for tenant
     */
    async getConnectedClient(tenantId) {
        try {
            const tenant = await this.getTenantRecord(tenantId);
            const sessionString = tenant?.telegramSession;
            if (!sessionString) {
                return null;
            }
            const { apiId, apiHash } = await this.getApiCredentials(tenantId);
            const stringSession = new sessions_1.StringSession(sessionString);
            const client = new telegram_1.TelegramClient(stringSession, apiId, apiHash, {
                connectionRetries: 5,
                deviceModel: 'RA SEBI Compliance Portal'
            });
            await client.connect();
            return { client, sessionString };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] Failed to initialize connected client:', err.message);
            return null;
        }
    }
    /**
     * Fetch all channels / supergroups where the logged-in admin is Admin or Creator
     */
    async fetchAdminChannelsAndGroups(tenantId) {
        try {
            const conn = await this.getConnectedClient(tenantId);
            if (!conn) {
                return {
                    success: false,
                    error: 'No active Telegram Phone session connected. Please connect your Telegram account first.'
                };
            }
            const { client } = conn;
            const dialogs = await client.getDialogs({ limit: 100 });
            const results = [];
            for (const d of dialogs) {
                const entity = d.entity;
                if (!entity)
                    continue;
                const isChannel = d.isChannel || entity.className === 'Channel';
                const isGroup = d.isGroup || entity.className === 'Chat';
                if (!isChannel && !isGroup)
                    continue;
                const isCreator = Boolean(entity.creator);
                const isAdmin = Boolean(entity.adminRights || entity.creator || d.title);
                const isBroadcast = Boolean(entity.broadcast);
                const isMegagroup = Boolean(entity.megagroup);
                // Standard Bot API Chat ID calculation:
                // Channels & Supergroups: -100 + entity.id
                // Basic groups: - + entity.id
                let rawId = String(entity.id);
                let botChatId = '';
                if (rawId.startsWith('-100')) {
                    botChatId = rawId;
                }
                else if (rawId.startsWith('-')) {
                    botChatId = rawId;
                }
                else if (isChannel || isMegagroup || isBroadcast) {
                    botChatId = `-100${rawId}`;
                }
                else {
                    botChatId = `-${rawId}`;
                }
                let type = 'supergroup';
                if (isBroadcast) {
                    type = 'channel';
                }
                else if (isGroup && !isMegagroup) {
                    type = 'group';
                }
                const name = entity.title || d.title || `Telegram ${type}`;
                const username = entity.username || null;
                const memberCount = entity.participantsCount || null;
                let inviteLink = username ? `https://t.me/${username}` : null;
                results.push({
                    chatId: botChatId,
                    name,
                    type,
                    username,
                    memberCount,
                    isCreator,
                    isAdmin,
                    inviteLink
                });
            }
            return {
                success: true,
                groups: results
            };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] fetchAdminChannelsAndGroups error:', err);
            return { success: false, error: err?.message || 'Failed to fetch Telegram dialogs' };
        }
    }
    /**
     * Synchronize fetched admin groups into `TelegramGroup` collection
     */
    async syncUserGroupsWithClient(client, tenantId, userId) {
        const dialogs = await client.getDialogs({ limit: 100 });
        let syncedCount = 0;
        const syncedGroups = [];
        const existingGroups = db_1.default?.TelegramGroup
            ? await db_1.default.TelegramGroup.find({ tenantId, deletedAt: null }).lean()
            : [];
        const existingMap = new Map(existingGroups.map((g) => [String(g.chatId), g]));
        for (const d of dialogs) {
            const entity = d.entity;
            if (!entity)
                continue;
            const isChannel = d.isChannel || entity.className === 'Channel';
            const isGroup = d.isGroup || entity.className === 'Chat';
            if (!isChannel && !isGroup)
                continue;
            const isBroadcast = Boolean(entity.broadcast);
            const isMegagroup = Boolean(entity.megagroup);
            let rawId = String(entity.id);
            let botChatId = '';
            if (rawId.startsWith('-100') || rawId.startsWith('-')) {
                botChatId = rawId;
            }
            else if (isChannel || isMegagroup || isBroadcast) {
                botChatId = `-100${rawId}`;
            }
            else {
                botChatId = `-${rawId}`;
            }
            let type = 'supergroup';
            if (isBroadcast)
                type = 'channel';
            else if (isGroup && !isMegagroup)
                type = 'group';
            const name = entity.title || d.title || `Telegram ${type}`;
            const username = entity.username || null;
            const memberCount = entity.participantsCount || 0;
            let inviteLink = username ? `https://t.me/${username}` : null;
            // Check if already in database
            const existing = existingMap.get(botChatId);
            if (existing && db_1.default?.TelegramGroup) {
                await db_1.default.TelegramGroup.findByIdAndUpdate(existing._id, {
                    $set: {
                        name,
                        type,
                        username: username || existing.username,
                        memberCount: memberCount || existing.memberCount,
                        inviteLink: existing.inviteLink || inviteLink
                    }
                });
                syncedCount++;
                syncedGroups.push({ ...existing, name, type, memberCount });
            }
            else if (db_1.default?.TelegramGroup && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                const created = await db_1.default.TelegramGroup.create({
                    tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                    name,
                    chatId: botChatId,
                    inviteLink,
                    type,
                    username,
                    memberCount,
                    isDefault: existingGroups.length === 0 && syncedCount === 0,
                    status: 'ACTIVE',
                    createdById: userId && mongoose_1.default.Types.ObjectId.isValid(userId) ? new mongoose_1.default.Types.ObjectId(userId) : null
                });
                syncedCount++;
                syncedGroups.push(created.toObject ? created.toObject() : created);
            }
        }
        // If tenant has no default telegramChatId configured, set the first synced group
        if (syncedGroups.length > 0 && db_1.default?.Tenant) {
            try {
                const tenant = await db_1.default.Tenant.findById(tenantId);
                if (tenant && !tenant.telegramChatId) {
                    tenant.telegramChatId = syncedGroups[0].chatId;
                    if (syncedGroups[0].inviteLink && !tenant.telegramInviteLink) {
                        tenant.telegramInviteLink = syncedGroups[0].inviteLink;
                    }
                    await tenant.save();
                }
            }
            catch { }
        }
        return { syncedCount, groups: syncedGroups };
    }
    /**
     * Sync all groups for tenant using saved session
     */
    async syncTenantGroups(tenantId, userId) {
        try {
            const conn = await this.getConnectedClient(tenantId);
            if (!conn) {
                return {
                    success: false,
                    syncedCount: 0,
                    error: 'No active Telegram Phone session found for this tenant.'
                };
            }
            const syncResult = await this.syncUserGroupsWithClient(conn.client, tenantId, userId);
            return {
                success: true,
                syncedCount: syncResult.syncedCount,
                groups: syncResult.groups
            };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] syncTenantGroups error:', err);
            return {
                success: false,
                syncedCount: 0,
                error: err.message || 'Failed to sync groups from Telegram session'
            };
        }
    }
    /**
     * STEP 3: Create a brand new Telegram Channel / Supergroup directly on Admin's Telegram Account!
     */
    async createChannelOnAccount(options) {
        const { tenantId, title, about, isBroadcast = true, assignedPlanId, userId } = options;
        try {
            const conn = await this.getConnectedClient(tenantId);
            if (!conn) {
                return {
                    success: false,
                    error: 'No active Telegram Phone session found. Please connect your Telegram Phone number first.'
                };
            }
            const { client } = conn;
            // 1. Invoke Telegram MTProto to create channel
            const result = await client.invoke(new telegram_1.Api.channels.CreateChannel({
                title: title.trim(),
                about: about?.trim() || 'Official Trading & Market Advisory Signal Channel',
                broadcast: isBroadcast,
                megagroup: !isBroadcast
            }));
            const createdChat = result?.chats && result.chats.length > 0 ? result.chats[0] : null;
            if (!createdChat) {
                return {
                    success: false,
                    error: 'Telegram did not return created channel details.'
                };
            }
            const rawId = String(createdChat.id);
            const botChatId = `-100${rawId}`;
            const groupType = isBroadcast ? 'channel' : 'supergroup';
            // 2. Export Invite Link for the newly created channel
            let inviteLink = null;
            try {
                const inviteRes = await client.invoke(new telegram_1.Api.messages.ExportChatInvite({
                    peer: createdChat
                }));
                if (inviteRes?.link) {
                    inviteLink = inviteRes.link;
                }
            }
            catch (invErr) {
                console.warn('[TelegramMtprotoService] Could not export chat invite link:', invErr.message);
            }
            // 2b. Automatically invite and promote the tenant safe Bot to Admin if bot is configured!
            try {
                const config = await telegramService_1.default.getConfig(tenantId);
                if (config.botToken) {
                    const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
                    const botRes = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`, { timeout: 5000 });
                    const botUsername = botRes.data?.result?.username;
                    if (botUsername) {
                        try {
                            const botPeer = await client.getInputEntity(botUsername);
                            try {
                                await client.invoke(new telegram_1.Api.channels.InviteToChannel({
                                    channel: createdChat,
                                    users: [botPeer]
                                }));
                            }
                            catch (invErr) {
                                console.warn('[TelegramMtprotoService] InviteToChannel note:', invErr.message);
                            }
                            await client.invoke(new telegram_1.Api.channels.EditAdmin({
                                channel: createdChat,
                                userId: botPeer,
                                adminRights: new telegram_1.Api.ChatAdminRights({
                                    changeInfo: true,
                                    postMessages: true,
                                    editMessages: true,
                                    deleteMessages: true,
                                    banUsers: true,
                                    inviteUsers: true,
                                    pinMessages: true,
                                    addAdmins: false,
                                    anonymous: false,
                                    manageCall: true,
                                    other: true
                                }),
                                rank: 'Broadcast Bot'
                            }));
                            console.log(`[TelegramMtprotoService] Bot @${botUsername} automatically promoted to Admin in ${title}`);
                        }
                        catch (adminErr) {
                            console.warn('[TelegramMtprotoService] EditAdmin warning:', adminErr.message);
                        }
                    }
                }
            }
            catch (botErr) {
                console.warn('[TelegramMtprotoService] Auto-bot assignment notice:', botErr.message);
            }
            // 3. Save into TelegramGroup collection
            let savedGroup = null;
            if (db_1.default?.TelegramGroup && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                savedGroup = await db_1.default.TelegramGroup.create({
                    tenantId: new mongoose_1.default.Types.ObjectId(tenantId),
                    name: title.trim(),
                    chatId: botChatId,
                    inviteLink: inviteLink || null,
                    type: groupType,
                    username: createdChat.username || null,
                    memberCount: 1,
                    isDefault: false,
                    status: 'ACTIVE',
                    createdById: userId && mongoose_1.default.Types.ObjectId.isValid(userId) ? new mongoose_1.default.Types.ObjectId(userId) : null
                });
            }
            // 4. Auto-map to Plan if assignedPlanId was specified
            if (assignedPlanId && db_1.default?.Plan) {
                try {
                    await db_1.default.Plan.findByIdAndUpdate(assignedPlanId, {
                        $set: {
                            telegramChatId: botChatId,
                            telegramGroupName: title.trim(),
                            telegramInviteLink: inviteLink || null
                        }
                    });
                }
                catch (planErr) {
                    console.warn('[TelegramMtprotoService] Could not auto-map to plan:', planErr.message);
                }
            }
            return {
                success: true,
                channel: {
                    id: botChatId,
                    title: title.trim(),
                    inviteLink,
                    type: groupType
                },
                group: savedGroup?.toObject ? savedGroup.toObject() : savedGroup
            };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] createChannelOnAccount error:', err);
            return {
                success: false,
                error: err?.errorMessage || err?.message || 'Failed to create Telegram channel on account'
            };
        }
    }
    /**
     * Disconnect Telegram Phone session
     */
    async disconnect(tenantId) {
        try {
            const resetFields = {
                telegramPhone: null,
                telegramSession: null,
                telegramUser: null
            };
            if (db_1.default?.Tenant && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                await db_1.default.Tenant.findByIdAndUpdate(tenantId, { $set: resetFields });
            }
            else if (db_1.default?.Tenant) {
                await db_1.default.Tenant.findOneAndUpdate({ $or: [{ id: tenantId }, { tenantId: tenantId }] }, { $set: resetFields });
            }
            if (db_1.centralModels?.Tenant && mongoose_1.default.Types.ObjectId.isValid(tenantId)) {
                await db_1.centralModels.Tenant.findByIdAndUpdate(tenantId, { $set: resetFields });
            }
            return { success: true };
        }
        catch (err) {
            console.error('[TelegramMtprotoService] disconnect error:', err);
            return { success: false, error: err.message };
        }
    }
    /**
     * Get Telegram phone connection status
     */
    async getAuthStatus(tenantId) {
        try {
            const tenant = await this.getTenantRecord(tenantId);
            const isConnected = Boolean(tenant?.telegramSession && tenant?.telegramPhone);
            return {
                isConnected,
                phone: tenant?.telegramPhone || null,
                user: tenant?.telegramUser || null,
                hasSession: Boolean(tenant?.telegramSession)
            };
        }
        catch (err) {
            return {
                isConnected: false,
                phone: null,
                user: null,
                hasSession: false
            };
        }
    }
}
exports.TelegramMtprotoService = TelegramMtprotoService;
exports.telegramMtprotoService = TelegramMtprotoService.getInstance();
exports.default = exports.telegramMtprotoService;
