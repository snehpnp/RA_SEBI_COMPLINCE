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
exports.telegramService = exports.TelegramService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importStar(require("../config/db"));
class TelegramService {
    static instance;
    static getInstance() {
        if (!TelegramService.instance) {
            TelegramService.instance = new TelegramService();
        }
        return TelegramService.instance;
    }
    /**
     * Helper to format time in IST (12-hour AM/PM)
     */
    formatTimeIST(date = new Date()) {
        return date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
    /**
     * Resolve Telegram Bot Token, Chat ID, and Invite Link
     * Priority:
     * 1. Explicit arguments
     * 2. Tenant configuration in database (if tenantId provided)
     * 3. Process environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_INVITE_LINK)
     */
    async getConfig(tenantId) {
        let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
        let chatId = process.env.TELEGRAM_CHAT_ID || '';
        let inviteLink = process.env.TELEGRAM_INVITE_LINK || '';
        try {
            let tenant = null;
            if (tenantId && db_1.default?.Tenant) {
                try {
                    tenant = await db_1.default.Tenant.findById(tenantId).lean();
                }
                catch { }
                if (!tenant) {
                    tenant = await db_1.default.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
                }
            }
            if (!tenant && tenantId && db_1.centralModels?.Tenant) {
                try {
                    tenant = await db_1.centralModels.Tenant.findById(tenantId).lean();
                }
                catch { }
                if (!tenant) {
                    tenant = await db_1.centralModels.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
                }
            }
            if (!tenant) {
                if (db_1.default?.Tenant)
                    tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
                if (!tenant && db_1.centralModels?.Tenant)
                    tenant = await db_1.centralModels.Tenant.findOne({ deletedAt: null }).lean();
            }
            if (tenant) {
                if (tenant.telegramBotToken)
                    botToken = tenant.telegramBotToken.trim();
                if (tenant.telegramChatId)
                    chatId = String(tenant.telegramChatId).trim();
                if (tenant.telegramInviteLink)
                    inviteLink = tenant.telegramInviteLink.trim();
            }
        }
        catch (err) {
            console.warn('[TelegramService] Error fetching tenant telegram config:', err.message);
        }
        return {
            botToken: botToken.trim(),
            chatId: chatId.trim(),
            inviteLink: inviteLink.trim()
        };
    }
    /**
     * Checks if Telegram is configured
     */
    isConfigured(config) {
        const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        const chat = config?.chatId || process.env.TELEGRAM_CHAT_ID;
        return Boolean(token && chat);
    }
    /**
     * Formats a clean, professional Trading Signal Telegram message
     */
    formatSignalMessage(payload) {
        const actionUpper = (payload.action || 'BUY').toUpperCase();
        const isBuy = actionUpper.includes('BUY');
        const actionEmoji = isBuy ? '🟢' : '🔴';
        const timeStr = payload.time || this.formatTimeIST();
        const symbolStr = (payload.symbol || '').toUpperCase();
        const lines = [
            '📊 <b>NEW TRADING SIGNAL</b>\n',
            `${actionEmoji} <b>Action:</b> ${actionUpper}`,
            `📌 <b>Symbol:</b> ${symbolStr}`
        ];
        if (payload.segment) {
            lines.push(`📑 <b>Segment:</b> ${payload.segment.toUpperCase()}`);
        }
        if (payload.strikePrice || payload.optionType || payload.expiryDate) {
            const optDetails = [];
            if (payload.strikePrice)
                optDetails.push(String(payload.strikePrice));
            if (payload.optionType)
                optDetails.push(payload.optionType.toUpperCase());
            if (payload.expiryDate) {
                const exp = new Date(payload.expiryDate);
                if (!isNaN(exp.getTime())) {
                    optDetails.push(`(Exp: ${exp.toLocaleDateString('en-IN')})`);
                }
            }
            if (optDetails.length > 0) {
                lines.push(`⚡ <b>Contract:</b> ${optDetails.join(' ')}`);
            }
        }
        const entryLabel = payload.entryType ? `${payload.entryType} ` : '';
        lines.push(`💰 <b>Entry:</b> ${entryLabel}${payload.entry}`);
        lines.push(`🎯 <b>Target:</b> ${payload.target}`);
        if (payload.target2) {
            lines.push(`🎯 <b>Target 2:</b> ${payload.target2}`);
        }
        if (payload.target3) {
            lines.push(`🎯 <b>Target 3:</b> ${payload.target3}`);
        }
        lines.push(`🛑 <b>Stop Loss:</b> ${payload.stopLoss}`);
        if (payload.tradeDuration) {
            lines.push(`⏳ <b>Duration:</b> ${payload.tradeDuration}`);
        }
        if (payload.description) {
            lines.push(`\n📝 <b>Note:</b> ${payload.description}`);
        }
        lines.push(`\n⏰ <b>Time:</b> ${timeStr}`);
        lines.push(`\n⚠️ <i>Disclaimer: Research & advisory recommendation. Follow strict risk management.</i>`);
        return lines.join('\n');
    }
    /**
     * Formats a clean Signal Update / Close message
     */
    formatSignalUpdateMessage(payload) {
        const timeStr = payload.time || this.formatTimeIST();
        const symbolStr = (payload.symbol || '').toUpperCase();
        const statusUpper = (payload.status || 'UPDATE').toUpperCase();
        let statusEmoji = '🔔';
        if (statusUpper.includes('TARGET') || statusUpper.includes('PROFIT')) {
            statusEmoji = '🎯';
        }
        else if (statusUpper.includes('STOPLOSS') || statusUpper.includes('LOSS')) {
            statusEmoji = '🛑';
        }
        else if (statusUpper.includes('CLOSE') || statusUpper.includes('EXIT')) {
            statusEmoji = '🏁';
        }
        const lines = [
            '📊 <b>TRADING SIGNAL UPDATE</b>\n',
            `📌 <b>Symbol:</b> ${symbolStr}`,
            `${statusEmoji} <b>Status:</b> ${statusUpper}`
        ];
        if (payload.exitPrice) {
            lines.push(`💰 <b>Exit Price:</b> ${payload.exitPrice}`);
        }
        if (payload.remark) {
            lines.push(`📝 <b>Remark:</b> ${payload.remark}`);
        }
        lines.push(`\n⏰ <b>Time:</b> ${timeStr}`);
        return lines.join('\n');
    }
    /**
     * Send arbitrary message to Telegram chat/group
     */
    async sendMessage(text, options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            const chatId = (options?.chatId || config.chatId)?.trim();
            if (!botToken || !chatId) {
                console.warn('[TelegramService] Telegram credentials not configured. Message skipped.');
                return { success: false, error: 'Telegram credentials not configured' };
            }
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const payload = {
                chat_id: chatId,
                text,
                parse_mode: options?.parseMode || 'HTML',
                disable_web_page_preview: options?.disableWebPagePreview ?? true
            };
            const response = await axios_1.default.post(url, payload, { timeout: 10000 });
            return { success: true, data: response.data };
        }
        catch (err) {
            const rawMsg = err.response?.data?.description || err.message;
            let errMsg = rawMsg;
            if (typeof rawMsg === 'string' && rawMsg.toLowerCase().includes('chat not found')) {
                errMsg = `Bot is not in this group/channel. Please add the Bot (@Complince_signal_bot) into the Telegram group/channel and promote it to Admin with post permissions.`;
            }
            console.error('[TelegramService] Failed to send Telegram message:', rawMsg);
            return { success: false, error: errMsg };
        }
    }
    /**
     * Formats and broadcasts a new trading signal to the common Telegram group
     */
    async sendSignal(payload, options) {
        try {
            const message = this.formatSignalMessage(payload);
            return await this.sendMessage(message, {
                parseMode: 'HTML',
                disableWebPagePreview: true,
                tenantId: options?.tenantId,
                chatId: options?.chatId,
                botToken: options?.botToken
            });
        }
        catch (err) {
            console.error('[TelegramService] Error in sendSignal:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Formats and broadcasts a trading signal update/close to Telegram
     */
    async sendSignalUpdate(payload, options) {
        try {
            const message = this.formatSignalUpdateMessage(payload);
            return await this.sendMessage(message, {
                parseMode: 'HTML',
                disableWebPagePreview: true,
                tenantId: options?.tenantId,
                chatId: options?.chatId,
                botToken: options?.botToken
            });
        }
        catch (err) {
            console.error('[TelegramService] Error in sendSignalUpdate:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Retrieve chat metadata (title, username, members, invite_link) & bot info
     */
    async getChatInfo(options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            const chatId = (options?.chatId || config.chatId)?.trim();
            if (!botToken || !chatId) {
                return { success: false, error: 'Telegram botToken and chatId are required' };
            }
            // 1. Fetch Bot Info (getMe)
            const botRes = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });
            // 2. Fetch Chat Info (getChat)
            const chatRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChat`, { chat_id: chatId }, { timeout: 10000 });
            // 3. Member count if possible
            let memberCount = null;
            try {
                const countRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChatMemberCount`, { chat_id: chatId }, { timeout: 5000 });
                memberCount = countRes.data?.result;
            }
            catch { }
            return {
                success: true,
                data: {
                    bot: botRes.data?.result,
                    chat: chatRes.data?.result,
                    memberCount,
                    configuredInviteLink: config.inviteLink || null
                }
            };
        }
        catch (err) {
            const errMsg = err.response?.data?.description || err.message;
            return { success: false, error: errMsg };
        }
    }
    /**
     * Retrieve or generate the Telegram group invite link
     * Checks:
     * 1. Explicitly configured invite link in tenant settings or .env
     * 2. Telegram Bot API `exportChatInviteLink` or `createChatInviteLink` or `getChat.invite_link`
     */
    async getInviteLink(options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            const chatId = (options?.chatId || config.chatId)?.trim();
            // If invite link is explicitly configured in .env or tenant DB and NO custom chatId was requested
            if (config.inviteLink && (!options?.chatId || options.chatId === config.chatId)) {
                return { success: true, inviteLink: config.inviteLink };
            }
            if (!botToken || !chatId) {
                return {
                    success: false,
                    error: 'Telegram credentials are not configured. Please set Bot Token and Chat ID.'
                };
            }
            // 1. Try createChatInviteLink (creates a fresh invite link)
            try {
                const createRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, { chat_id: chatId, name: options?.name || 'Client Signal Access' }, { timeout: 8000 });
                if (createRes.data?.ok && createRes.data?.result?.invite_link) {
                    return { success: true, inviteLink: createRes.data.result.invite_link };
                }
            }
            catch (createErr) {
                // Continue to exportChatInviteLink
            }
            // 2. Try exportChatInviteLink
            try {
                const exportRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/exportChatInviteLink`, { chat_id: chatId }, { timeout: 8000 });
                if (exportRes.data?.ok && exportRes.data?.result) {
                    return { success: true, inviteLink: exportRes.data.result };
                }
            }
            catch (exportErr) {
                // Continue to getChat fallback
            }
            // 3. Fallback: getChat
            try {
                const chatRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChat`, { chat_id: chatId }, { timeout: 8000 });
                const chatResult = chatRes.data?.result;
                if (chatResult?.invite_link) {
                    return { success: true, inviteLink: chatResult.invite_link };
                }
                if (chatResult?.username) {
                    return { success: true, inviteLink: `https://t.me/${chatResult.username}` };
                }
            }
            catch (chatErr) { }
            // 4. Fallback: Bot username direct link (e.g. https://t.me/Complince_signal_bot)
            try {
                const botRes = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 6000 });
                const botUsername = botRes.data?.result?.username;
                if (botUsername) {
                    return {
                        success: true,
                        inviteLink: `https://t.me/${botUsername}`,
                        botUsername
                    };
                }
            }
            catch { }
            return {
                success: false,
                error: 'Could not automatically generate invite link. Please ensure bot is an Admin in the group with invite permissions.'
            };
        }
        catch (err) {
            const errMsg = err.response?.data?.description || err.message;
            return { success: false, error: errMsg };
        }
    }
    /**
     * Test Telegram connection by validating Bot credentials and sending a test message
     */
    async testConnection(botToken, chatId, tenantId) {
        try {
            const config = await this.getConfig(tenantId);
            const token = (botToken || config.botToken)?.trim();
            const chat = (chatId || config.chatId)?.trim();
            if (!token || !chat) {
                return {
                    success: false,
                    error: 'Bot Token and Chat ID are required for testing connection'
                };
            }
            // 1. Verify Bot Token
            const botRes = await axios_1.default.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 10000 });
            if (!botRes.data?.ok) {
                return { success: false, error: 'Invalid Bot Token' };
            }
            const botInfo = botRes.data.result;
            // 2. Verify Chat ID / Get Chat Info
            const chatRes = await axios_1.default.post(`https://api.telegram.org/bot${token}/getChat`, { chat_id: chat }, { timeout: 10000 });
            if (!chatRes.data?.ok) {
                return { success: false, error: 'Bot cannot access the specified Chat ID. Ensure bot is added to the group.' };
            }
            const chatInfo = chatRes.data.result;
            // 3. Send a test message
            const testMsg = [
                '🤖 <b>TELEGRAM BOT CONNECTED</b>\n',
                `✅ <b>Status:</b> Integration Active`,
                `🏢 <b>Group/Channel:</b> ${chatInfo.title || chatInfo.username || chat}`,
                `⏰ <b>Timestamp:</b> ${this.formatTimeIST()}`,
                '\n<i>Your trading platform is now ready to broadcast live market signals here!</i>'
            ].join('\n');
            const sendRes = await axios_1.default.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chat,
                text: testMsg,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            }, { timeout: 10000 });
            return {
                success: true,
                bot: botInfo,
                chat: chatInfo,
                message: 'Telegram Bot connected successfully! Test message sent to group.'
            };
        }
        catch (err) {
            const errMsg = err.response?.data?.description || err.message;
            return { success: false, error: errMsg };
        }
    }
    /**
     * Auto-detect groups/channels where the bot is added by scanning getUpdates
     */
    async detectGroupsFromUpdates(options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            if (!botToken) {
                return { success: false, error: 'Telegram botToken is required' };
            }
            // Verify Bot Token
            const botRes = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });
            const bot = botRes.data?.result;
            // Get updates
            const updatesRes = await axios_1.default.get(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-100&limit=100`, { timeout: 10000 });
            const updates = updatesRes.data?.result || [];
            const detectedChatsMap = new Map();
            // If configured default chatId exists, add it to probe
            if (config.chatId) {
                detectedChatsMap.set(String(config.chatId), {
                    chatId: String(config.chatId),
                    name: 'Primary Configured Group',
                    type: 'supergroup',
                    username: null
                });
            }
            for (const update of updates) {
                const chat = update.message?.chat ||
                    update.my_chat_member?.chat ||
                    update.chat_member?.chat ||
                    update.channel_post?.chat ||
                    update.edited_message?.chat ||
                    update.edited_channel_post?.chat;
                if (chat && ['group', 'supergroup', 'channel'].includes(chat.type)) {
                    const chatIdStr = String(chat.id);
                    detectedChatsMap.set(chatIdStr, {
                        chatId: chatIdStr,
                        name: chat.title || chat.username || `Group ${chatIdStr}`,
                        type: chat.type,
                        username: chat.username || null
                    });
                }
            }
            const results = [];
            for (const [chatId, baseInfo] of detectedChatsMap.entries()) {
                let name = baseInfo.name;
                let type = baseInfo.type;
                let username = baseInfo.username;
                let memberCount = null;
                let inviteLink = null;
                try {
                    const chatRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChat`, { chat_id: chatId }, { timeout: 5000 });
                    if (chatRes.data?.ok) {
                        const chatObj = chatRes.data.result;
                        name = chatObj.title || chatObj.username || name;
                        type = chatObj.type || type;
                        username = chatObj.username || username;
                        if (chatObj.invite_link)
                            inviteLink = chatObj.invite_link;
                    }
                }
                catch { }
                try {
                    const countRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChatMemberCount`, { chat_id: chatId }, { timeout: 5000 });
                    if (countRes.data?.ok) {
                        memberCount = countRes.data.result;
                    }
                }
                catch { }
                if (!inviteLink) {
                    try {
                        const linkRes = await this.getInviteLink({ botToken, chatId, name });
                        if (linkRes.success && linkRes.inviteLink) {
                            inviteLink = linkRes.inviteLink;
                        }
                    }
                    catch { }
                }
                results.push({
                    chatId,
                    name,
                    type,
                    username,
                    memberCount,
                    inviteLink
                });
            }
            return {
                success: true,
                bot,
                detectedGroups: results
            };
        }
        catch (err) {
            const errMsg = err.response?.data?.description || err.message;
            return { success: false, error: errMsg };
        }
    }
    /**
     * Retrieve full details & generate invite link for a specific Chat ID
     */
    async getChatMetadataAndInvite(chatId, options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            if (!botToken || !chatId) {
                return { success: false, error: 'Telegram botToken and chatId are required' };
            }
            const chatRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChat`, { chat_id: chatId }, { timeout: 8000 });
            if (!chatRes.data?.ok) {
                return { success: false, error: 'Could not fetch chat information from Telegram' };
            }
            const chat = chatRes.data.result;
            const name = chat.title || chat.username || `Group ${chatId}`;
            const type = chat.type || 'supergroup';
            const username = chat.username || null;
            let memberCount = null;
            let inviteLink = chat.invite_link || null;
            try {
                const countRes = await axios_1.default.post(`https://api.telegram.org/bot${botToken}/getChatMemberCount`, { chat_id: chatId }, { timeout: 5000 });
                if (countRes.data?.ok) {
                    memberCount = countRes.data.result;
                }
            }
            catch { }
            if (!inviteLink) {
                try {
                    const linkRes = await this.getInviteLink({ botToken, chatId, name });
                    if (linkRes.success && linkRes.inviteLink) {
                        inviteLink = linkRes.inviteLink;
                    }
                }
                catch { }
            }
            return {
                success: true,
                data: {
                    chatId,
                    name,
                    type,
                    username,
                    memberCount,
                    inviteLink
                }
            };
        }
        catch (err) {
            const errMsg = err.response?.data?.description || err.message;
            return { success: false, error: errMsg };
        }
    }
}
exports.TelegramService = TelegramService;
exports.telegramService = TelegramService.getInstance();
exports.default = exports.telegramService;
