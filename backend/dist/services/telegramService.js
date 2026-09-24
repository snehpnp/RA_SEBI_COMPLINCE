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
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importStar(require("../config/db"));
const tenantConnectionManager_1 = require("./tenantConnectionManager");
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
    /**
     * Send arbitrary message to Telegram chat/group with optional Inline/Reply Keyboards
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
            if (options?.replyMarkup) {
                payload.reply_markup = options.replyMarkup;
            }
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
     * Configure Telegram Chat Menu Button (e.g., 'Talk to Expert' or 'Dashboard' button in input bar)
     */
    async setChatMenuButton(options) {
        try {
            const config = await this.getConfig(options?.tenantId);
            const botToken = (options?.botToken || config.botToken)?.trim();
            if (!botToken) {
                return { success: false, error: 'Bot token not configured' };
            }
            const url = `https://api.telegram.org/bot${botToken}/setChatMenuButton`;
            const payload = {};
            if (options?.chatId) {
                payload.chat_id = options.chatId;
            }
            if (options?.menuButton) {
                payload.menu_button = options.menuButton;
            }
            const response = await axios_1.default.post(url, payload, { timeout: 10000 });
            return { success: true, data: response.data };
        }
        catch (err) {
            console.warn('[TelegramService] setChatMenuButton error:', err.response?.data || err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Register standard bot commands in Telegram
     */
    async setBotCommands(botToken) {
        try {
            const config = await this.getConfig();
            const token = (botToken || config.botToken)?.trim();
            if (!token)
                return;
            const commands = [
                { command: 'start', description: 'Start Bot & Link Account' },
                { command: 'plans', description: 'View My Active VIP Subscriptions' },
                { command: 'expert', description: 'Talk to Research Analyst Expert' },
                { command: 'dashboard', description: 'Open Web Client Dashboard' },
                { command: 'help', description: 'Help & Contact Information' }
            ];
            await axios_1.default.post(`https://api.telegram.org/bot${token}/setMyCommands`, { commands }, { timeout: 8000 });
        }
        catch (err) {
            console.warn('[TelegramService] Failed to set bot commands:', err.message);
        }
    }
    /**
     * Answer Telegram callback queries to dismiss pending UI spinners
     */
    async answerCallbackQuery(callbackQueryId, options) {
        try {
            const config = await this.getConfig();
            const token = (options?.botToken || config.botToken)?.trim();
            if (!token || !callbackQueryId)
                return;
            const payload = { callback_query_id: callbackQueryId };
            if (options?.text)
                payload.text = options.text;
            if (options?.showAlert)
                payload.show_alert = options.showAlert;
            await axios_1.default.post(`https://api.telegram.org/bot${token}/answerCallbackQuery`, payload, { timeout: 5000 });
        }
        catch { }
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
    /**
     * Generates a 1-time secure token for connecting a client's Telegram account via /start <token>
     */
    async generateClientConnectToken(clientId, tenantId, planId) {
        try {
            const config = await this.getConfig(tenantId);
            let botUsername = '';
            if (config.botToken) {
                try {
                    const botRes = await axios_1.default.get(`https://api.telegram.org/bot${config.botToken}/getMe`, { timeout: 5000 });
                    botUsername = botRes.data?.result?.username || '';
                }
                catch { }
            }
            if (!botUsername) {
                botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Complince_signal_bot';
            }
            const token = crypto_1.default.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
            let client = null;
            if (db_1.default?.Client) {
                try {
                    client = await db_1.default.Client.findById(clientId);
                }
                catch { }
            }
            if (!client && db_1.centralModels?.Client) {
                try {
                    client = await db_1.centralModels.Client.findById(clientId);
                }
                catch { }
            }
            if (!client) {
                return { success: false, error: 'Client account not found' };
            }
            client.telegramAuthToken = token;
            client.telegramAuthTokenExpiresAt = expiresAt;
            client.telegramTargetPlanId = planId ? String(planId) : null;
            await client.save();
            const deepLink = `https://t.me/${botUsername}?start=${token}`;
            return {
                success: true,
                token,
                expiresAt,
                botUsername,
                deepLink
            };
        }
        catch (err) {
            console.error('[TelegramService] Error generating connect token:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Unlinks a client's Telegram account
     */
    async unlinkClientTelegram(clientId, tenantId) {
        try {
            let client = null;
            if (db_1.default?.Client) {
                try {
                    client = await db_1.default.Client.findById(clientId);
                }
                catch { }
            }
            if (!client && db_1.centralModels?.Client) {
                try {
                    client = await db_1.centralModels.Client.findById(clientId);
                }
                catch { }
            }
            if (!client) {
                return { success: false, error: 'Client not found' };
            }
            client.telegramChatId = null;
            client.telegramUsername = null;
            client.telegramLinkedAt = null;
            client.telegramAuthToken = null;
            client.telegramAuthTokenExpiresAt = null;
            await client.save();
            return { success: true };
        }
        catch (err) {
            console.error('[TelegramService] Error unlinking Telegram:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Helper to find a linked client by their Telegram Chat ID across central and tenant databases
     */
    async findClientByChatId(chatId) {
        if (!chatId)
            return null;
        let client = null;
        if (db_1.default?.Client) {
            try {
                client = await db_1.default.Client.findOne({ telegramChatId: chatId, deletedAt: null });
            }
            catch { }
        }
        if (!client && db_1.centralModels?.Client) {
            try {
                client = await db_1.centralModels.Client.findOne({ telegramChatId: chatId, deletedAt: null });
            }
            catch { }
        }
        if (!client && db_1.centralModels?.Tenant) {
            try {
                const allTenants = await db_1.centralModels.Tenant.find({ deletedAt: null }).lean();
                for (const t of allTenants) {
                    try {
                        const tConn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(t._id.toString());
                        if (tConn?.models?.Client) {
                            const found = await tConn.models.Client.findOne({ telegramChatId: chatId, deletedAt: null });
                            if (found) {
                                client = found;
                                break;
                            }
                        }
                    }
                    catch { }
                }
            }
            catch { }
        }
        return client;
    }
    /**
     * Helper to retrieve a client's active subscriptions, plans, and tenant branding
     */
    async getClientActivePlans(clientId, tenantId) {
        const now = new Date();
        let tenant = null;
        let targetModels = db_1.default;
        if (tenantId) {
            try {
                const tConn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(String(tenantId));
                if (tConn?.models)
                    targetModels = tConn.models;
            }
            catch { }
            if (db_1.default?.Tenant) {
                try {
                    tenant = await db_1.default.Tenant.findById(tenantId).lean();
                }
                catch { }
            }
            if (!tenant && db_1.centralModels?.Tenant) {
                try {
                    tenant = await db_1.centralModels.Tenant.findById(tenantId).lean();
                }
                catch { }
            }
        }
        if (!tenant) {
            if (db_1.default?.Tenant)
                tenant = await db_1.default.Tenant.findOne({ deletedAt: null }).lean();
            if (!tenant && db_1.centralModels?.Tenant)
                tenant = await db_1.centralModels.Tenant.findOne({ deletedAt: null }).lean();
        }
        const companyName = tenant?.panelName || tenant?.companyName || 'AurumX';
        let rawDashboardUrl = tenant?.domainUrl || tenant?.website || process.env.FRONTEND_URL || 'http://localhost:3000';
        if (!rawDashboardUrl.startsWith('http://') && !rawDashboardUrl.startsWith('https://')) {
            rawDashboardUrl = `https://${rawDashboardUrl}`;
        }
        const dashboardUrl = `${rawDashboardUrl.replace(/\/+$/, '')}/client`;
        let activeSubs = [];
        if (targetModels?.Subscription) {
            try {
                activeSubs = await targetModels.Subscription.find({
                    clientId,
                    status: 'ACTIVE',
                    endDate: { $gte: now },
                    deletedAt: null
                }).lean();
            }
            catch { }
        }
        if (activeSubs.length === 0 && db_1.default?.Subscription) {
            try {
                activeSubs = await db_1.default.Subscription.find({
                    clientId,
                    status: 'ACTIVE',
                    endDate: { $gte: now },
                    deletedAt: null
                }).lean();
            }
            catch { }
        }
        if (activeSubs.length === 0 && db_1.centralModels?.Subscription) {
            try {
                activeSubs = await db_1.centralModels.Subscription.find({
                    clientId,
                    status: 'ACTIVE',
                    endDate: { $gte: now },
                    deletedAt: null
                }).lean();
            }
            catch { }
        }
        const planIds = Array.from(new Set(activeSubs.map((s) => s.planId?.toString()).filter(Boolean)));
        let plans = [];
        if (planIds.length > 0) {
            if (targetModels?.Plan) {
                try {
                    plans = await targetModels.Plan.find({ _id: { $in: planIds }, deletedAt: null }).lean();
                }
                catch { }
            }
            if (plans.length === 0 && db_1.default?.Plan) {
                try {
                    plans = await db_1.default.Plan.find({ _id: { $in: planIds }, deletedAt: null }).lean();
                }
                catch { }
            }
            if (plans.length === 0 && db_1.centralModels?.Plan) {
                try {
                    plans = await db_1.centralModels.Plan.find({ _id: { $in: planIds }, deletedAt: null }).lean();
                }
                catch { }
            }
        }
        return { plans, companyName, tenant, dashboardUrl };
    }
    /**
     * Process incoming Telegram webhook updates or polling updates
     */
    async processTelegramUpdate(update, tenantId) {
        try {
            // 1. Handle Callback Queries (when inline buttons are pressed)
            if (update.callback_query) {
                const cb = update.callback_query;
                const cbData = cb.data || '';
                const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
                const config = await this.getConfig(tenantId);
                const botToken = config.botToken;
                await this.answerCallbackQuery(cb.id, { botToken });
                if (cbData === 'action_expert') {
                    await this.sendExpertHelpMessage(cbChatId, tenantId, botToken);
                    return { handled: true, action: 'CALLBACK_EXPERT' };
                }
                else if (cbData === 'action_plans') {
                    await this.sendActivePlansMessage(cbChatId, tenantId, botToken);
                    return { handled: true, action: 'CALLBACK_PLANS' };
                }
                else if (cbData === 'action_dashboard') {
                    await this.sendDashboardMessage(cbChatId, tenantId, botToken);
                    return { handled: true, action: 'CALLBACK_DASHBOARD' };
                }
                return { handled: true };
            }
            const message = update.message || update.edited_message;
            if (!message || !message.text) {
                return { handled: false };
            }
            const text = message.text.trim();
            const lowerText = text.toLowerCase();
            const chatId = String(message.chat.id);
            const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'
            const fromUser = message.from;
            const username = fromUser?.username || `${fromUser?.first_name || ''} ${fromUser?.last_name || ''}`.trim() || 'Telegram User';
            const config = await this.getConfig(tenantId);
            const botToken = config.botToken;
            if (!botToken) {
                return { handled: false };
            }
            // 2. Handle /start or /connect commands
            if (text.startsWith('/start') || text.startsWith('/connect')) {
                const parts = text.split(/\s+/);
                const token = parts[1]?.trim();
                // 2a. /start without token
                if (!token) {
                    if (chatType === 'private') {
                        const linkedClient = await this.findClientByChatId(chatId);
                        if (linkedClient) {
                            // User is already linked: send their active subscription card & quick menu
                            await this.sendActivePlansMessage(chatId, tenantId || linkedClient.tenantId, botToken, linkedClient);
                        }
                        else {
                            const { companyName, dashboardUrl } = await this.getClientActivePlans(null, tenantId);
                            const welcomeMsg = [
                                `👋 <b>Welcome to ${companyName} Compliance & Signal Bot!</b>\n`,
                                `To receive verified real-time trading signals directly in your Telegram, please link your account:`,
                                `1️⃣ Log in to your <b>Client Portal</b> on our platform.`,
                                `2️⃣ Go to <b>Telegram Alerts</b> / <b>Subscription Center</b>.`,
                                `3️⃣ Click <b>"Connect Telegram"</b> to link automatically.\n`,
                                `<i>Need assistance? Our research analyst team is always ready to support you.</i>`
                            ].join('\n');
                            const inlineKeyboard = [
                                [{ text: `🌐 Open ${companyName} Portal`, url: dashboardUrl }],
                                [{ text: `💬 Talk to Expert`, callback_data: 'action_expert' }]
                            ];
                            await this.sendMessage(welcomeMsg, {
                                chatId,
                                botToken,
                                parseMode: 'HTML',
                                replyMarkup: { inline_keyboard: inlineKeyboard }
                            });
                            // Also provide the persistent quick menu
                            await this.sendNavigationKeyboard(chatId, botToken);
                        }
                    }
                    return { handled: true, action: 'START_WITHOUT_TOKEN' };
                }
                // 2b. Token provided - Verify token in Client collection
                const now = new Date();
                let parsedToken = token;
                let targetPlanIdFromToken = null;
                if (token.startsWith('plan_')) {
                    const tParts = token.split('_');
                    if (tParts.length >= 3) {
                        targetPlanIdFromToken = tParts[1];
                        parsedToken = tParts.slice(2).join('_');
                    }
                }
                let client = null;
                const tokenQuery = {
                    $or: [
                        { telegramAuthToken: parsedToken },
                        { telegramAuthToken: token }
                    ],
                    telegramAuthTokenExpiresAt: { $gte: now }
                };
                if (db_1.default?.Client) {
                    try {
                        client = await db_1.default.Client.findOne(tokenQuery);
                    }
                    catch { }
                }
                if (!client && db_1.centralModels?.Client) {
                    try {
                        client = await db_1.centralModels.Client.findOne(tokenQuery);
                    }
                    catch { }
                }
                if (!client) {
                    try {
                        const allTenants = await db_1.centralModels.Tenant.find({ deletedAt: null }).lean();
                        for (const t of allTenants) {
                            try {
                                const tConn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(t._id.toString());
                                if (tConn?.models?.Client) {
                                    const foundClient = await tConn.models.Client.findOne(tokenQuery);
                                    if (foundClient) {
                                        client = foundClient;
                                        break;
                                    }
                                }
                            }
                            catch { }
                        }
                    }
                    catch { }
                }
                if (!client) {
                    const failMsg = [
                        `❌ <b>Linking Failed</b>\n`,
                        `The authorization token is invalid or has expired (tokens are valid for 15 minutes).\n`,
                        `Please return to your <b>Client Dashboard</b> and click <b>"Join Channel"</b> or <b>"Connect Telegram"</b> to generate a fresh link.`
                    ].join('\n');
                    await this.sendMessage(failMsg, { chatId, botToken, parseMode: 'HTML' });
                    return { handled: true, action: 'INVALID_OR_EXPIRED_TOKEN' };
                }
                // Token is valid: update Client record
                const targetPlanId = targetPlanIdFromToken || client.telegramTargetPlanId;
                client.telegramChatId = chatId;
                client.telegramUsername = username;
                client.telegramLinkedAt = new Date();
                client.telegramAuthToken = null;
                client.telegramAuthTokenExpiresAt = null;
                client.telegramTargetPlanId = null;
                await client.save();
                // Fetch active subscriptions and tenant branding
                const { plans, companyName, tenant, dashboardUrl } = await this.getClientActivePlans(client._id, client.tenantId || tenantId);
                // Check if there is a targeted plan requested
                let targetPlan = null;
                if (targetPlanId) {
                    targetPlan = plans.find((p) => String(p._id) === String(targetPlanId) || String(p.id) === String(targetPlanId));
                    if (!targetPlan) {
                        try {
                            if (db_1.default?.Plan)
                                targetPlan = await db_1.default.Plan.findById(targetPlanId).lean();
                            if (!targetPlan && db_1.centralModels?.Plan)
                                targetPlan = await db_1.centralModels.Plan.findById(targetPlanId).lean();
                        }
                        catch { }
                    }
                }
                if (targetPlan) {
                    // Resolve channel invite link for the target plan
                    let planInvite = targetPlan.telegramInviteLink || '';
                    if (!planInvite && targetPlan.telegramChatId && botToken) {
                        try {
                            const linkRes = await this.getInviteLink({
                                tenantId: client.tenantId || tenantId,
                                botToken,
                                chatId: String(targetPlan.telegramChatId),
                                name: `${targetPlan.name || 'VIP'} Signal Channel`
                            });
                            if (linkRes.success && linkRes.inviteLink) {
                                planInvite = linkRes.inviteLink;
                            }
                        }
                        catch { }
                    }
                    if (!planInvite && tenant?.telegramInviteLink) {
                        planInvite = tenant.telegramInviteLink;
                    }
                    if (!planInvite) {
                        planInvite = `https://t.me/${config.botToken ? 'Complince_signal_bot' : 'Complince_signal_bot'}`;
                    }
                    const planName = targetPlan.name || 'VIP Signals';
                    const inlineKeyboard = [];
                    // PRIMARY BUTTON: Click to go to the Channel!
                    inlineKeyboard.push([
                        {
                            text: `🚀 JOIN ${planName.toUpperCase()} CHANNEL NOW ➔`,
                            url: planInvite
                        }
                    ]);
                    // Other active plans (if any)
                    const otherPlans = plans.filter((p) => String(p._id || p.id) !== String(targetPlan._id || targetPlan.id || targetPlanId));
                    for (const op of otherPlans) {
                        const opInvite = op.telegramInviteLink || tenant?.telegramInviteLink;
                        if (opInvite) {
                            inlineKeyboard.push([
                                {
                                    text: `📡 Join ${op.name.toUpperCase()} Channel ➔`,
                                    url: opInvite
                                }
                            ]);
                        }
                    }
                    // Dashboard and Support buttons
                    inlineKeyboard.push([
                        {
                            text: `🌐 Open ${companyName} Dashboard`,
                            url: dashboardUrl
                        },
                        {
                            text: `💬 Talk to Expert`,
                            callback_data: 'action_expert'
                        }
                    ]);
                    const planWelcomeMsg = [
                        `🎉 <b>Congratulations, ${client.name || username}!</b>\n`,
                        `✅ Your <b>${companyName}</b> account is verified & connected!\n`,
                        `📢 <b>Your VIP Channel:</b> <b>${planName}</b>`,
                        `⚡ <b>Status:</b> <code>ACTIVE SUBSCRIBER 🟢</code>\n`,
                        `👇 <b>Click below to enter your ${planName} Channel immediately:</b>`
                    ].join('\n');
                    await this.sendMessage(planWelcomeMsg, {
                        chatId,
                        botToken,
                        parseMode: 'HTML',
                        replyMarkup: { inline_keyboard: inlineKeyboard }
                    });
                }
                else {
                    // General welcome card with all active plans
                    let activePlansText = '';
                    const inlineKeyboard = [];
                    if (plans.length > 0) {
                        activePlansText = plans.map((p) => `• <b>${(p.name || 'VIP SIGNALS').toUpperCase()}</b>`).join('\n');
                        for (const p of plans) {
                            const planInvite = p.telegramInviteLink || tenant?.telegramInviteLink;
                            if (planInvite) {
                                inlineKeyboard.push([
                                    {
                                        text: `🚀 JOIN ${p.name.toUpperCase()} VIP CHANNEL NOW ➔`,
                                        url: planInvite
                                    }
                                ]);
                            }
                        }
                    }
                    else {
                        activePlansText = `• <b>STANDARD ADVISORY ACCESS</b>`;
                        if (tenant?.telegramInviteLink) {
                            inlineKeyboard.push([
                                {
                                    text: `🚀 JOIN ${companyName.toUpperCase()} VIP CHANNEL NOW ➔`,
                                    url: tenant.telegramInviteLink
                                }
                            ]);
                        }
                    }
                    // Add Dashboard link button
                    inlineKeyboard.push([
                        {
                            text: `🌐 Open ${companyName} Dashboard`,
                            url: dashboardUrl
                        },
                        {
                            text: `💬 Talk to Expert`,
                            callback_data: 'action_expert'
                        }
                    ]);
                    const welcomeSuccessMsg = [
                        `🎉 <b>Congratulations, ${client.name || username}!</b>\n`,
                        `✅ Your <b>${companyName}</b> account is now <b>Successfully Connected!</b>\n`,
                        `📦 <b>Active VIP Subscriptions:</b>`,
                        activePlansText,
                        `\n👇 <b>Click below to enter your VIP Channels immediately:</b>`
                    ].join('\n');
                    await this.sendMessage(welcomeSuccessMsg, {
                        chatId,
                        botToken,
                        parseMode: 'HTML',
                        replyMarkup: { inline_keyboard: inlineKeyboard }
                    });
                }
                // 2. Activate persistent ReplyKeyboardMarkup with 'Talk to Expert'
                await this.sendNavigationKeyboard(chatId, botToken);
                // 3. Configure Telegram Chat Menu Button if possible
                try {
                    await this.setChatMenuButton({
                        chatId,
                        botToken,
                        menuButton: {
                            type: 'commands'
                        }
                    });
                }
                catch { }
                console.log(`[TelegramService] Successfully linked client ${client.name} (${client._id}) with chatId: ${chatId}`);
                return {
                    handled: true,
                    action: 'LINK_SUCCESS',
                    details: { clientId: client._id, name: client.name, chatId, username, targetPlanId }
                };
            }
            // 3. Handle 'Talk to Expert' / '/expert' / '/support'
            if (lowerText.includes('talk to expert') ||
                lowerText.includes('expert') ||
                lowerText.includes('support') ||
                lowerText.includes('contact') ||
                lowerText.startsWith('/expert') ||
                lowerText.startsWith('/support')) {
                await this.sendExpertHelpMessage(chatId, tenantId, botToken);
                return { handled: true, action: 'TALK_TO_EXPERT' };
            }
            // 4. Handle 'Active Subscriptions' / 'My Subscriptions' / '/plans'
            if (lowerText.includes('subscription') ||
                lowerText.includes('plan') ||
                lowerText.startsWith('/plans') ||
                lowerText.startsWith('/subscriptions')) {
                await this.sendActivePlansMessage(chatId, tenantId, botToken);
                return { handled: true, action: 'VIEW_PLANS' };
            }
            // 5. Handle 'Open Dashboard' / '/dashboard' / 'portal'
            if (lowerText.includes('dashboard') ||
                lowerText.includes('portal') ||
                lowerText.startsWith('/dashboard') ||
                lowerText.startsWith('/portal')) {
                await this.sendDashboardMessage(chatId, tenantId, botToken);
                return { handled: true, action: 'OPEN_DASHBOARD' };
            }
            // 6. Handle 'Help' / '/help'
            if (lowerText.includes('help') || lowerText.startsWith('/help')) {
                await this.sendHelpGuideMessage(chatId, tenantId, botToken);
                return { handled: true, action: 'HELP' };
            }
            return { handled: false };
        }
        catch (err) {
            console.error('[TelegramService] Error processing Telegram update:', err.message);
            return { handled: false, details: err.message };
        }
    }
    /**
     * Sends the persistent bottom ReplyKeyboardMarkup for 1-tap quick actions
     */
    async sendNavigationKeyboard(chatId, botToken) {
        try {
            const keyboardMarkup = {
                keyboard: [
                    [{ text: '💬 Talk to Expert' }, { text: '📊 My Active Subscriptions' }],
                    [{ text: '🌐 Open Dashboard' }, { text: '❓ Help & Support' }]
                ],
                resize_keyboard: true,
                is_persistent: true
            };
            await this.sendMessage('⚡ <i>Quick menu enabled below. Tap anytime for instant assistance!</i>', {
                chatId,
                botToken,
                parseMode: 'HTML',
                replyMarkup: keyboardMarkup
            });
        }
        catch (err) {
            console.warn('[TelegramService] Error sending navigation keyboard:', err.message);
        }
    }
    /**
     * Sends the 'Talk to Expert' Advisory and Support response
     */
    async sendExpertHelpMessage(chatId, tenantId, botToken) {
        try {
            const linkedClient = await this.findClientByChatId(chatId);
            const { companyName, tenant, dashboardUrl } = await this.getClientActivePlans(linkedClient?._id, tenantId || linkedClient?.tenantId);
            const supportPhone = tenant?.mobile || '+91 98765 43210';
            const supportEmail = tenant?.email || `support@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
            const raOwner = tenant?.ownerName || 'Compliance Officer';
            const sebiReg = tenant?.sebiRegistration || 'INH000000000';
            const expertMsg = [
                `👨‍💼 <b>Research Analyst Expert Support</b>\n`,
                `Have questions regarding trading recommendations, risk management, or subscriptions? Our SEBI-registered advisory team is here to assist you!\n`,
                `🏢 <b>Advisory:</b> <b>${companyName}</b>`,
                `👤 <b>Analyst / Principal:</b> ${raOwner}`,
                `🛡️ <b>SEBI Registration:</b> <code>${sebiReg}</code>`,
                `📞 <b>Helpline:</b> <code>${supportPhone}</code>`,
                `📧 <b>Support Email:</b> <code>${supportEmail}</code>`,
                `⏰ <b>Market Support Hours:</b> 09:00 AM - 05:00 PM IST (Mon - Fri)\n`,
                `👇 <i>You can connect with us directly or open a ticket from your Client Portal:</i>`
            ].join('\n');
            const inlineKeyboard = [
                [
                    { text: `🌐 Open Support Desk in Portal`, url: `${dashboardUrl}/support` },
                ],
                [
                    { text: `📊 View My Subscriptions`, callback_data: 'action_plans' },
                    { text: `🌐 Open Dashboard`, url: dashboardUrl }
                ]
            ];
            await this.sendMessage(expertMsg, {
                chatId,
                botToken,
                parseMode: 'HTML',
                replyMarkup: { inline_keyboard: inlineKeyboard }
            });
        }
        catch (err) {
            console.error('[TelegramService] Error sending expert help message:', err.message);
        }
    }
    /**
     * Sends the client's Active Subscriptions and direct channel join links
     */
    async sendActivePlansMessage(chatId, tenantId, botToken, providedClient) {
        try {
            const client = providedClient || (await this.findClientByChatId(chatId));
            const { plans, companyName, tenant, dashboardUrl } = await this.getClientActivePlans(client?._id, tenantId || client?.tenantId);
            if (!client) {
                const unlinkedMsg = [
                    `⚠️ <b>Telegram Account Not Linked</b>\n`,
                    `Please log in to your <b>${companyName}</b> client dashboard and click <b>"Connect Telegram"</b> to link your account and view active subscriptions.`
                ].join('\n');
                await this.sendMessage(unlinkedMsg, {
                    chatId,
                    botToken,
                    parseMode: 'HTML',
                    replyMarkup: {
                        inline_keyboard: [[{ text: `🌐 Open ${companyName} Portal`, url: dashboardUrl }]]
                    }
                });
                return;
            }
            const inlineKeyboard = [];
            let plansText = '';
            if (plans.length > 0) {
                plansText = plans.map((p) => `• <b>${(p.name || 'VIP SIGNALS').toUpperCase()}</b> (Active)`).join('\n');
                for (const p of plans) {
                    const planInvite = p.telegramInviteLink || tenant?.telegramInviteLink;
                    if (planInvite) {
                        inlineKeyboard.push([
                            {
                                text: `🚀 JOIN ${p.name.toUpperCase()} VIP CHANNEL NOW ➔`,
                                url: planInvite
                            }
                        ]);
                    }
                }
            }
            else {
                plansText = `• <i>No active subscriptions found.</i>`;
            }
            inlineKeyboard.push([
                { text: `🌐 Open ${companyName} Dashboard`, url: dashboardUrl },
                { text: `💬 Talk to Expert`, callback_data: 'action_expert' }
            ]);
            const subMsg = [
                `📦 <b>Active Subscriptions for ${client.name || 'Client'}:</b>\n`,
                plansText,
                `\n👇 <b>Click below to access your VIP Trading Signal Channels:</b>`
            ].join('\n');
            await this.sendMessage(subMsg, {
                chatId,
                botToken,
                parseMode: 'HTML',
                replyMarkup: { inline_keyboard: inlineKeyboard }
            });
        }
        catch (err) {
            console.error('[TelegramService] Error sending active plans message:', err.message);
        }
    }
    /**
     * Sends the Client Portal Dashboard link
     */
    async sendDashboardMessage(chatId, tenantId, botToken) {
        try {
            const linkedClient = await this.findClientByChatId(chatId);
            const { companyName, dashboardUrl } = await this.getClientActivePlans(linkedClient?._id, tenantId || linkedClient?.tenantId);
            const msg = [
                `🌐 <b>${companyName} Client Portal Dashboard</b>\n`,
                `Access your live recommendations, compliance disclosures, performance analytics, and invoices directly from your portal.\n`,
                `👇 <i>Click the button below to open your dashboard:</i>`
            ].join('\n');
            const inlineKeyboard = [
                [{ text: `🌐 Open ${companyName} Dashboard`, url: dashboardUrl }],
                [{ text: `💬 Talk to Expert`, callback_data: 'action_expert' }]
            ];
            await this.sendMessage(msg, {
                chatId,
                botToken,
                parseMode: 'HTML',
                replyMarkup: { inline_keyboard: inlineKeyboard }
            });
        }
        catch (err) {
            console.error('[TelegramService] Error sending dashboard message:', err.message);
        }
    }
    /**
     * Sends general Help & Command Guide message
     */
    async sendHelpGuideMessage(chatId, tenantId, botToken) {
        try {
            const linkedClient = await this.findClientByChatId(chatId);
            const { companyName, dashboardUrl } = await this.getClientActivePlans(linkedClient?._id, tenantId || linkedClient?.tenantId);
            const helpMsg = [
                `🤖 <b>${companyName} Signal Bot Help Center</b>\n`,
                `Here is how you can use this bot:`,
                `• <b>💬 Talk to Expert:</b> Connect directly with our research analyst team.`,
                `• <b>📊 My Active Subscriptions:</b> View and join your VIP Signal Channels.`,
                `• <b>🌐 Open Dashboard:</b> Access your personalized client web portal.`,
                `• <b>⚡ Instant Signals:</b> You automatically receive all live BUY/SELL alerts matching your plans.\n`,
                `👇 <i>Choose an action below:</i>`
            ].join('\n');
            const inlineKeyboard = [
                [
                    { text: `💬 Talk to Expert`, callback_data: 'action_expert' },
                    { text: `📊 My Subscriptions`, callback_data: 'action_plans' }
                ],
                [{ text: `🌐 Open ${companyName} Dashboard`, url: dashboardUrl }]
            ];
            await this.sendMessage(helpMsg, {
                chatId,
                botToken,
                parseMode: 'HTML',
                replyMarkup: { inline_keyboard: inlineKeyboard }
            });
        }
        catch (err) {
            console.error('[TelegramService] Error sending help guide message:', err.message);
        }
    }
    /**
     * Background polling loop for local development & continuous update ingestion
     */
    pollerInterval = null;
    pollerOffset = 0;
    isPolling = false;
    startBotPoller() {
        if (this.pollerInterval)
            return;
        console.log('[TelegramService] Starting background Telegram bot poller...');
        this.getConfig().then((cfg) => {
            if (cfg.botToken) {
                this.setBotCommands(cfg.botToken);
            }
        });
        this.pollerInterval = setInterval(async () => {
            if (this.isPolling)
                return;
            this.isPolling = true;
            try {
                const config = await this.getConfig();
                if (!config.botToken) {
                    this.isPolling = false;
                    return;
                }
                const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${this.pollerOffset}&limit=20&timeout=2`;
                const res = await axios_1.default.get(url, { timeout: 6000 });
                if (res.data?.ok && Array.isArray(res.data.result)) {
                    for (const update of res.data.result) {
                        this.pollerOffset = update.update_id + 1;
                        await this.processTelegramUpdate(update);
                    }
                }
            }
            catch (err) {
                // Silently ignore transient network poll issues
            }
            finally {
                this.isPolling = false;
            }
        }, 3500);
    }
    stopBotPoller() {
        if (this.pollerInterval) {
            clearInterval(this.pollerInterval);
            this.pollerInterval = null;
        }
    }
    /**
     * Dispatches a Trading Signal or Update to BOTH:
     * 1. The mapped Telegram Channel / Group (with chatId stored)
     * 2. Direct Messages (DMs) to active, unexpired subscribers of the plan who have linked Telegram
     *
     * Records full audit logs in TelegramDeliveryLog collection.
     */
    async dispatchSignalToPlanAndSubscribers(payload, options) {
        const directDeliveries = [];
        let channelDelivery;
        let totalDelivered = 0;
        try {
            const config = await this.getConfig(options.tenantId);
            const botToken = (options.botToken || config.botToken)?.trim();
            if (!botToken) {
                console.warn('[TelegramService] Cannot dispatch signal: Telegram bot token not configured');
                return { totalDelivered: 0 };
            }
            // 1. Format the message
            const formattedMessage = options.isUpdate
                ? this.formatSignalUpdateMessage(payload)
                : this.formatSignalMessage(payload);
            // 2. Resolve tenant-specific models if tenantId provided
            let targetTenantModels = null;
            if (options.tenantId) {
                try {
                    const tConn = await tenantConnectionManager_1.tenantConnectionManager.getTenantConnection(options.tenantId);
                    if (tConn?.models) {
                        targetTenantModels = tConn.models;
                    }
                }
                catch { }
            }
            // Fetch Plan metadata if planId provided
            let plan = null;
            if (options.planId) {
                if (targetTenantModels?.Plan) {
                    try {
                        plan = await targetTenantModels.Plan.findById(options.planId).lean();
                    }
                    catch { }
                }
                if (!plan && db_1.default?.Plan) {
                    try {
                        plan = await db_1.default.Plan.findById(options.planId).lean();
                    }
                    catch { }
                }
                if (!plan && db_1.centralModels?.Plan) {
                    try {
                        plan = await db_1.centralModels.Plan.findById(options.planId).lean();
                    }
                    catch { }
                }
            }
            // 3. Resolve Target Channel / Group Chat ID
            let targetChatId = options.chatId || plan?.telegramChatId;
            if (!targetChatId && config.chatId) {
                targetChatId = config.chatId;
            }
            // 4. STEP A: Broadcast to Telegram Channel / Group
            if (targetChatId) {
                const chanRes = await this.sendMessage(formattedMessage, {
                    chatId: targetChatId,
                    botToken,
                    tenantId: options.tenantId
                });
                const chanMsgId = chanRes.data?.result?.message_id || null;
                channelDelivery = {
                    success: chanRes.success,
                    error: chanRes.error,
                    messageId: chanMsgId,
                    chatId: targetChatId
                };
                if (chanRes.success) {
                    totalDelivered++;
                }
                // Store Channel Delivery Log
                try {
                    const logPayload = {
                        tenantId: options.tenantId || plan?.tenantId || null,
                        signalId: options.signalId || null,
                        planId: options.planId || null,
                        planName: plan?.name || null,
                        targetType: 'CHANNEL',
                        targetChatId: String(targetChatId),
                        status: (chanRes.success ? 'DELIVERED' : 'FAILED'),
                        symbol: payload.symbol,
                        action: payload.action || payload.status,
                        errorMessage: chanRes.error || null,
                        telegramMessageId: chanMsgId,
                        sentAt: new Date()
                    };
                    if (targetTenantModels?.TelegramDeliveryLog) {
                        await targetTenantModels.TelegramDeliveryLog.create(logPayload);
                    }
                    else if (db_1.default?.TelegramDeliveryLog) {
                        await db_1.default.TelegramDeliveryLog.create(logPayload);
                    }
                    else if (db_1.centralModels?.TelegramDeliveryLog) {
                        await db_1.centralModels.TelegramDeliveryLog.create(logPayload);
                    }
                }
                catch (logErr) {
                    console.error('[TelegramService] Error saving channel delivery log:', logErr.message);
                }
            }
            // 5. STEP B: Send DMs to Active Plan Subscribers with Linked Telegram
            if (options.planId) {
                const now = new Date();
                let activeSubs = [];
                if (targetTenantModels?.Subscription) {
                    try {
                        activeSubs = await targetTenantModels.Subscription.find({
                            planId: options.planId,
                            status: 'ACTIVE',
                            endDate: { $gte: now },
                            deletedAt: null
                        }).lean();
                    }
                    catch { }
                }
                if (activeSubs.length === 0 && db_1.default?.Subscription) {
                    try {
                        activeSubs = await db_1.default.Subscription.find({
                            planId: options.planId,
                            status: 'ACTIVE',
                            endDate: { $gte: now },
                            deletedAt: null
                        }).lean();
                    }
                    catch { }
                }
                if (activeSubs.length === 0 && db_1.centralModels?.Subscription) {
                    try {
                        activeSubs = await db_1.centralModels.Subscription.find({
                            planId: options.planId,
                            status: 'ACTIVE',
                            endDate: { $gte: now },
                            deletedAt: null
                        }).lean();
                    }
                    catch { }
                }
                const clientIds = Array.from(new Set(activeSubs.map((s) => s.clientId?.toString()).filter(Boolean)));
                if (clientIds.length > 0) {
                    let subscribedClients = [];
                    if (targetTenantModels?.Client) {
                        try {
                            subscribedClients = await targetTenantModels.Client.find({
                                _id: { $in: clientIds },
                                telegramChatId: { $ne: null },
                                deletedAt: null
                            }).lean();
                        }
                        catch { }
                    }
                    if (subscribedClients.length === 0 && db_1.default?.Client) {
                        try {
                            subscribedClients = await db_1.default.Client.find({
                                _id: { $in: clientIds },
                                telegramChatId: { $ne: null },
                                deletedAt: null
                            }).lean();
                        }
                        catch { }
                    }
                    if (subscribedClients.length === 0 && db_1.centralModels?.Client) {
                        try {
                            subscribedClients = await db_1.centralModels.Client.find({
                                _id: { $in: clientIds },
                                telegramChatId: { $ne: null },
                                deletedAt: null
                            }).lean();
                        }
                        catch { }
                    }
                    for (const client of subscribedClients) {
                        if (!client.telegramChatId)
                            continue;
                        const dmRes = await this.sendMessage(formattedMessage, {
                            chatId: client.telegramChatId,
                            botToken,
                            tenantId: options.tenantId
                        });
                        const dmMsgId = dmRes.data?.result?.message_id || null;
                        if (dmRes.success) {
                            totalDelivered++;
                        }
                        directDeliveries.push({
                            clientId: client._id?.toString(),
                            name: client.name || client.email,
                            chatId: client.telegramChatId,
                            success: dmRes.success,
                            error: dmRes.error
                        });
                        // Store Direct Delivery Log
                        try {
                            const dmLogPayload = {
                                tenantId: options.tenantId || client.tenantId || plan?.tenantId || null,
                                signalId: options.signalId || null,
                                planId: options.planId || null,
                                planName: plan?.name || null,
                                targetType: 'USER_DIRECT',
                                targetChatId: String(client.telegramChatId),
                                recipientClientId: client._id,
                                recipientUserId: client.userId || null,
                                recipientName: client.name || client.email,
                                recipientUsername: client.telegramUsername || null,
                                status: (dmRes.success ? 'DELIVERED' : 'FAILED'),
                                symbol: payload.symbol,
                                action: payload.action || payload.status,
                                errorMessage: dmRes.error || null,
                                telegramMessageId: dmMsgId,
                                sentAt: new Date()
                            };
                            if (targetTenantModels?.TelegramDeliveryLog) {
                                await targetTenantModels.TelegramDeliveryLog.create(dmLogPayload);
                            }
                            else if (db_1.default?.TelegramDeliveryLog) {
                                await db_1.default.TelegramDeliveryLog.create(dmLogPayload);
                            }
                            else if (db_1.centralModels?.TelegramDeliveryLog) {
                                await db_1.centralModels.TelegramDeliveryLog.create(dmLogPayload);
                            }
                        }
                        catch (logErr) {
                            console.error('[TelegramService] Error saving subscriber delivery log:', logErr.message);
                        }
                    }
                }
            }
            return {
                channelDelivery,
                directDeliveries,
                totalSubscribersTargeted: directDeliveries.length,
                totalDelivered
            };
        }
        catch (err) {
            console.error('[TelegramService] Error in dispatchSignalToPlanAndSubscribers:', err.message);
            return { totalDelivered: 0 };
        }
    }
}
exports.TelegramService = TelegramService;
exports.telegramService = TelegramService.getInstance();
exports.default = exports.telegramService;
