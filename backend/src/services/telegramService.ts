import axios from 'axios';
import crypto from 'crypto';
import dynamicDb, { centralModels } from '../config/db';
import { tenantConnectionManager } from './tenantConnectionManager';

export interface TelegramSignalPayload {
  symbol: string;
  action: 'BUY' | 'SELL' | string;
  entry: number | string;
  entryType?: string; // e.g. "ABOVE", "BELOW", "AT", "CMP"
  target: number | string; // Primary target
  target2?: number | string | null;
  target3?: number | string | null;
  stopLoss: number | string;
  segment?: string; // EQUITY, FUTURES, OPTIONS, COMMODITY, etc.
  tradeDuration?: string; // INTRADAY, SHORT_TERM, POSITIONAL, etc.
  expiryDate?: string | Date | null;
  strikePrice?: number | string | null;
  optionType?: string | null; // CE / PE
  description?: string | null;
  time?: string;
}

export interface TelegramSignalUpdatePayload {
  symbol: string;
  status: string; // e.g. "TARGET 1 ACHIEVED", "STOP LOSS HIT", "CLOSED", "EXIT"
  exitPrice?: number | string | null;
  remark?: string | null;
  time?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  inviteLink?: string;
}

export class TelegramService {
  private static instance: TelegramService;

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  /**
   * Helper to format time in IST (12-hour AM/PM)
   */
  public formatTimeIST(date: Date = new Date()): string {
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
  public async getConfig(tenantId?: string): Promise<TelegramConfig> {
    let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    let chatId = process.env.TELEGRAM_CHAT_ID || '';
    let inviteLink = process.env.TELEGRAM_INVITE_LINK || '';

    try {
      let tenant: any = null;
      if (tenantId && dynamicDb?.Tenant) {
        try {
          tenant = await dynamicDb.Tenant.findById(tenantId).lean();
        } catch {}
        if (!tenant) {
          tenant = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
        }
      }
      if (!tenant && tenantId && centralModels?.Tenant) {
        try {
          tenant = await centralModels.Tenant.findById(tenantId).lean();
        } catch {}
        if (!tenant) {
          tenant = await centralModels.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
        }
      }
      if (!tenant) {
        if (dynamicDb?.Tenant) tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
        if (!tenant && centralModels?.Tenant) tenant = await centralModels.Tenant.findOne({ deletedAt: null }).lean();
      }

      if (tenant) {
        if (tenant.telegramBotToken) botToken = tenant.telegramBotToken.trim();
        if (tenant.telegramChatId) chatId = String(tenant.telegramChatId).trim();
        if (tenant.telegramInviteLink) inviteLink = tenant.telegramInviteLink.trim();
      }
    } catch (err: any) {
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
  public isConfigured(config?: Partial<TelegramConfig>): boolean {
    const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chat = config?.chatId || process.env.TELEGRAM_CHAT_ID;
    return Boolean(token && chat);
  }

  /**
   * Formats a clean, professional Trading Signal Telegram message
   */
  public formatSignalMessage(payload: TelegramSignalPayload): string {
    const actionUpper = (payload.action || 'BUY').toUpperCase();
    const isBuy = actionUpper.includes('BUY');
    const actionEmoji = isBuy ? '🟢' : '🔴';
    const timeStr = payload.time || this.formatTimeIST();
    const symbolStr = (payload.symbol || '').toUpperCase();

    const lines: string[] = [
      '📊 <b>NEW TRADING SIGNAL</b>\n',
      `${actionEmoji} <b>Action:</b> ${actionUpper}`,
      `📌 <b>Symbol:</b> ${symbolStr}`
    ];

    if (payload.segment) {
      lines.push(`📑 <b>Segment:</b> ${payload.segment.toUpperCase()}`);
    }

    if (payload.strikePrice || payload.optionType || payload.expiryDate) {
      const optDetails: string[] = [];
      if (payload.strikePrice) optDetails.push(String(payload.strikePrice));
      if (payload.optionType) optDetails.push(payload.optionType.toUpperCase());
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
  public formatSignalUpdateMessage(payload: TelegramSignalUpdatePayload): string {
    const timeStr = payload.time || this.formatTimeIST();
    const symbolStr = (payload.symbol || '').toUpperCase();
    const statusUpper = (payload.status || 'UPDATE').toUpperCase();

    let statusEmoji = '🔔';
    if (statusUpper.includes('TARGET') || statusUpper.includes('PROFIT')) {
      statusEmoji = '🎯';
    } else if (statusUpper.includes('STOPLOSS') || statusUpper.includes('LOSS')) {
      statusEmoji = '🛑';
    } else if (statusUpper.includes('CLOSE') || statusUpper.includes('EXIT')) {
      statusEmoji = '🏁';
    }

    const lines: string[] = [
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
  public async sendMessage(
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableWebPagePreview?: boolean;
      chatId?: string;
      botToken?: string;
      tenantId?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
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

      const response = await axios.post(url, payload, { timeout: 10000 });
      return { success: true, data: response.data };
    } catch (err: any) {
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
  public async sendSignal(
    payload: TelegramSignalPayload,
    options?: {
      tenantId?: string;
      chatId?: string;
      botToken?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const message = this.formatSignalMessage(payload);
      return await this.sendMessage(message, {
        parseMode: 'HTML',
        disableWebPagePreview: true,
        tenantId: options?.tenantId,
        chatId: options?.chatId,
        botToken: options?.botToken
      });
    } catch (err: any) {
      console.error('[TelegramService] Error in sendSignal:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Formats and broadcasts a trading signal update/close to Telegram
   */
  public async sendSignalUpdate(
    payload: TelegramSignalUpdatePayload,
    options?: {
      tenantId?: string;
      chatId?: string;
      botToken?: string;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const message = this.formatSignalUpdateMessage(payload);
      return await this.sendMessage(message, {
        parseMode: 'HTML',
        disableWebPagePreview: true,
        tenantId: options?.tenantId,
        chatId: options?.chatId,
        botToken: options?.botToken
      });
    } catch (err: any) {
      console.error('[TelegramService] Error in sendSignalUpdate:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Retrieve chat metadata (title, username, members, invite_link) & bot info
   */
  public async getChatInfo(options?: {
    botToken?: string;
    chatId?: string;
    tenantId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const config = await this.getConfig(options?.tenantId);
      const botToken = (options?.botToken || config.botToken)?.trim();
      const chatId = (options?.chatId || config.chatId)?.trim();

      if (!botToken || !chatId) {
        return { success: false, error: 'Telegram botToken and chatId are required' };
      }

      // 1. Fetch Bot Info (getMe)
      const botRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });

      // 2. Fetch Chat Info (getChat)
      const chatRes = await axios.post(
        `https://api.telegram.org/bot${botToken}/getChat`,
        { chat_id: chatId },
        { timeout: 10000 }
      );

      // 3. Member count if possible
      let memberCount: number | null = null;
      try {
        const countRes = await axios.post(
          `https://api.telegram.org/bot${botToken}/getChatMemberCount`,
          { chat_id: chatId },
          { timeout: 5000 }
        );
        memberCount = countRes.data?.result;
      } catch {}

      return {
        success: true,
        data: {
          bot: botRes.data?.result,
          chat: chatRes.data?.result,
          memberCount,
          configuredInviteLink: config.inviteLink || null
        }
      };
    } catch (err: any) {
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
  public async getInviteLink(options?: {
    botToken?: string;
    chatId?: string;
    tenantId?: string;
    name?: string;
  }): Promise<{ success: boolean; inviteLink?: string; botUsername?: string; error?: string }> {
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
        const createRes = await axios.post(
          `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
          { chat_id: chatId, name: options?.name || 'Client Signal Access' },
          { timeout: 8000 }
        );
        if (createRes.data?.ok && createRes.data?.result?.invite_link) {
          return { success: true, inviteLink: createRes.data.result.invite_link };
        }
      } catch (createErr: any) {
        // Continue to exportChatInviteLink
      }

      // 2. Try exportChatInviteLink
      try {
        const exportRes = await axios.post(
          `https://api.telegram.org/bot${botToken}/exportChatInviteLink`,
          { chat_id: chatId },
          { timeout: 8000 }
        );
        if (exportRes.data?.ok && exportRes.data?.result) {
          return { success: true, inviteLink: exportRes.data.result };
        }
      } catch (exportErr: any) {
        // Continue to getChat fallback
      }

      // 3. Fallback: getChat
      try {
        const chatRes = await axios.post(
          `https://api.telegram.org/bot${botToken}/getChat`,
          { chat_id: chatId },
          { timeout: 8000 }
        );

        const chatResult = chatRes.data?.result;
        if (chatResult?.invite_link) {
          return { success: true, inviteLink: chatResult.invite_link };
        }

        if (chatResult?.username) {
          return { success: true, inviteLink: `https://t.me/${chatResult.username}` };
        }
      } catch (chatErr: any) {}

      // 4. Fallback: Bot username direct link (e.g. https://t.me/Complince_signal_bot)
      try {
        const botRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 6000 });
        const botUsername = botRes.data?.result?.username;
        if (botUsername) {
          return {
            success: true,
            inviteLink: `https://t.me/${botUsername}`,
            botUsername
          };
        }
      } catch {}

      return {
        success: false,
        error: 'Could not automatically generate invite link. Please ensure bot is an Admin in the group with invite permissions.'
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.description || err.message;
      return { success: false, error: errMsg };
    }
  }

  /**
   * Test Telegram connection by validating Bot credentials and sending a test message
   */
  public async testConnection(
    botToken?: string,
    chatId?: string,
    tenantId?: string
  ): Promise<{ success: boolean; bot?: any; chat?: any; message?: string; error?: string }> {
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
      const botRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`, { timeout: 10000 });
      if (!botRes.data?.ok) {
        return { success: false, error: 'Invalid Bot Token' };
      }
      const botInfo = botRes.data.result;

      // 2. Verify Chat ID / Get Chat Info
      const chatRes = await axios.post(
        `https://api.telegram.org/bot${token}/getChat`,
        { chat_id: chat },
        { timeout: 10000 }
      );
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

      const sendRes = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chat,
          text: testMsg,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        },
        { timeout: 10000 }
      );

      return {
        success: true,
        bot: botInfo,
        chat: chatInfo,
        message: 'Telegram Bot connected successfully! Test message sent to group.'
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.description || err.message;
      return { success: false, error: errMsg };
    }
  }

  /**
   * Auto-detect groups/channels where the bot is added by scanning getUpdates
   */
  public async detectGroupsFromUpdates(options?: {
    botToken?: string;
    tenantId?: string;
  }): Promise<{
    success: boolean;
    detectedGroups?: Array<{
      chatId: string;
      name: string;
      type: string;
      username?: string | null;
      memberCount?: number | null;
      inviteLink?: string | null;
    }>;
    bot?: any;
    error?: string;
  }> {
    try {
      const config = await this.getConfig(options?.tenantId);
      const botToken = (options?.botToken || config.botToken)?.trim();

      if (!botToken) {
        return { success: false, error: 'Telegram botToken is required' };
      }

      // Verify Bot Token
      const botRes = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, { timeout: 10000 });
      const bot = botRes.data?.result;

      // Get updates
      const updatesRes = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates?offset=-100&limit=100`, { timeout: 10000 });
      const updates = updatesRes.data?.result || [];

      const detectedChatsMap = new Map<string, { chatId: string; name: string; type: string; username?: string | null }>();

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
        const chat =
          update.message?.chat ||
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

      const results: Array<{
        chatId: string;
        name: string;
        type: string;
        username?: string | null;
        memberCount?: number | null;
        inviteLink?: string | null;
      }> = [];

      for (const [chatId, baseInfo] of detectedChatsMap.entries()) {
        let name = baseInfo.name;
        let type = baseInfo.type;
        let username = baseInfo.username;
        let memberCount: number | null = null;
        let inviteLink: string | null = null;

        try {
          const chatRes = await axios.post(
            `https://api.telegram.org/bot${botToken}/getChat`,
            { chat_id: chatId },
            { timeout: 5000 }
          );
          if (chatRes.data?.ok) {
            const chatObj = chatRes.data.result;
            name = chatObj.title || chatObj.username || name;
            type = chatObj.type || type;
            username = chatObj.username || username;
            if (chatObj.invite_link) inviteLink = chatObj.invite_link;
          }
        } catch {}

        try {
          const countRes = await axios.post(
            `https://api.telegram.org/bot${botToken}/getChatMemberCount`,
            { chat_id: chatId },
            { timeout: 5000 }
          );
          if (countRes.data?.ok) {
            memberCount = countRes.data.result;
          }
        } catch {}

        if (!inviteLink) {
          try {
            const linkRes = await this.getInviteLink({ botToken, chatId, name });
            if (linkRes.success && linkRes.inviteLink) {
              inviteLink = linkRes.inviteLink;
            }
          } catch {}
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
    } catch (err: any) {
      const errMsg = err.response?.data?.description || err.message;
      return { success: false, error: errMsg };
    }
  }

  /**
   * Retrieve full details & generate invite link for a specific Chat ID
   */
  public async getChatMetadataAndInvite(
    chatId: string,
    options?: { botToken?: string; tenantId?: string }
  ): Promise<{
    success: boolean;
    data?: {
      chatId: string;
      name: string;
      type: string;
      username?: string | null;
      memberCount?: number | null;
      inviteLink?: string | null;
    };
    error?: string;
  }> {
    try {
      const config = await this.getConfig(options?.tenantId);
      const botToken = (options?.botToken || config.botToken)?.trim();

      if (!botToken || !chatId) {
        return { success: false, error: 'Telegram botToken and chatId are required' };
      }

      const chatRes = await axios.post(
        `https://api.telegram.org/bot${botToken}/getChat`,
        { chat_id: chatId },
        { timeout: 8000 }
      );

      if (!chatRes.data?.ok) {
        return { success: false, error: 'Could not fetch chat information from Telegram' };
      }

      const chat = chatRes.data.result;
      const name = chat.title || chat.username || `Group ${chatId}`;
      const type = chat.type || 'supergroup';
      const username = chat.username || null;
      let memberCount: number | null = null;
      let inviteLink = chat.invite_link || null;

      try {
        const countRes = await axios.post(
          `https://api.telegram.org/bot${botToken}/getChatMemberCount`,
          { chat_id: chatId },
          { timeout: 5000 }
        );
        if (countRes.data?.ok) {
          memberCount = countRes.data.result;
        }
      } catch {}

      if (!inviteLink) {
        try {
          const linkRes = await this.getInviteLink({ botToken, chatId, name });
          if (linkRes.success && linkRes.inviteLink) {
            inviteLink = linkRes.inviteLink;
          }
        } catch {}
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
    } catch (err: any) {
      const errMsg = err.response?.data?.description || err.message;
      return { success: false, error: errMsg };
    }
  }

  /**
   * Generates a 1-time secure token for connecting a client's Telegram account via /start <token>
   */
  public async generateClientConnectToken(
    clientId: string,
    tenantId?: string
  ): Promise<{
    success: boolean;
    token?: string;
    expiresAt?: Date;
    botUsername?: string;
    deepLink?: string;
    error?: string;
  }> {
    try {
      const config = await this.getConfig(tenantId);
      let botUsername = '';

      if (config.botToken) {
        try {
          const botRes = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`, { timeout: 5000 });
          botUsername = botRes.data?.result?.username || '';
        } catch {}
      }

      if (!botUsername) {
        botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Complince_signal_bot';
      }

      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

      let client: any = null;
      if (dynamicDb?.Client) {
        try {
          client = await dynamicDb.Client.findById(clientId);
        } catch {}
      }
      if (!client && centralModels?.Client) {
        try {
          client = await centralModels.Client.findById(clientId);
        } catch {}
      }

      if (!client) {
        return { success: false, error: 'Client account not found' };
      }

      client.telegramAuthToken = token;
      client.telegramAuthTokenExpiresAt = expiresAt;
      await client.save();

      const deepLink = `https://t.me/${botUsername}?start=${token}`;

      return {
        success: true,
        token,
        expiresAt,
        botUsername,
        deepLink
      };
    } catch (err: any) {
      console.error('[TelegramService] Error generating connect token:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Unlinks a client's Telegram account
   */
  public async unlinkClientTelegram(
    clientId: string,
    tenantId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let client: any = null;
      if (dynamicDb?.Client) {
        try {
          client = await dynamicDb.Client.findById(clientId);
        } catch {}
      }
      if (!client && centralModels?.Client) {
        try {
          client = await centralModels.Client.findById(clientId);
        } catch {}
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
    } catch (err: any) {
      console.error('[TelegramService] Error unlinking Telegram:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Process incoming Telegram webhook updates or polling updates
   */
  public async processTelegramUpdate(
    update: any,
    tenantId?: string
  ): Promise<{ handled: boolean; action?: string; details?: any }> {
    try {
      const message = update.message || update.edited_message;
      if (!message || !message.text) {
        return { handled: false };
      }

      const text = message.text.trim();
      const chatId = String(message.chat.id);
      const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'
      const fromUser = message.from;
      const username = fromUser?.username || `${fromUser?.first_name || ''} ${fromUser?.last_name || ''}`.trim() || 'Telegram User';

      const config = await this.getConfig(tenantId);
      const botToken = config.botToken;

      // Handle /start or /connect commands
      if (text.startsWith('/start') || text.startsWith('/connect')) {
        const parts = text.split(/\s+/);
        const token = parts[1]?.trim();

        // 1. /start without token in private chat
        if (!token) {
          if (chatType === 'private' && botToken) {
            const welcomeMsg = [
              `👋 <b>Welcome to Compliance Signal Bot!</b>\n`,
              `To receive live trading signals directly in your Telegram, please link your account:`,
              `1️⃣ Log in to your <b>Client Dashboard</b> on the website.`,
              `2️⃣ Click <b>"Connect Telegram"</b> in the Telegram Alerts section.`,
              `3️⃣ Click the generated button to connect your account.\n`,
              `<i>If you need assistance, please contact your research analyst support team.</i>`
            ].join('\n');

            await this.sendMessage(welcomeMsg, { chatId, botToken, parseMode: 'HTML' });
          }
          return { handled: true, action: 'START_WITHOUT_TOKEN' };
        }

        // 2. Token provided - Verify token in Client collection
        const now = new Date();
        let client: any = null;

        if (dynamicDb?.Client) {
          try {
            client = await dynamicDb.Client.findOne({
              telegramAuthToken: token,
              telegramAuthTokenExpiresAt: { $gte: now }
            });
          } catch {}
        }

        if (!client && centralModels?.Client) {
          try {
            client = await centralModels.Client.findOne({
              telegramAuthToken: token,
              telegramAuthTokenExpiresAt: { $gte: now }
            });
          } catch {}
        }

        if (!client) {
          try {
            const allTenants = await centralModels.Tenant.find({ deletedAt: null }).lean();
            for (const t of allTenants) {
              try {
                const tConn = await tenantConnectionManager.getTenantConnection(t._id.toString());
                const foundClient = await tConn.models.Client.findOne({
                  telegramAuthToken: token,
                  telegramAuthTokenExpiresAt: { $gte: now }
                });
                if (foundClient) {
                  client = foundClient;
                  break;
                }
              } catch {}
            }
          } catch {}
        }

        if (!client) {
          if (botToken) {
            const failMsg = [
              `❌ <b>Linking Failed</b>\n`,
              `The authorization token is invalid or has expired (tokens are valid for 15 minutes).\n`,
              `Please return to your <b>Client Dashboard</b> and click <b>"Connect Telegram"</b> to generate a fresh link.`
            ].join('\n');
            await this.sendMessage(failMsg, { chatId, botToken, parseMode: 'HTML' });
          }
          return { handled: true, action: 'INVALID_OR_EXPIRED_TOKEN' };
        }

        // Token is valid: update Client record
        client.telegramChatId = chatId;
        client.telegramUsername = username;
        client.telegramLinkedAt = new Date();
        client.telegramAuthToken = null;
        client.telegramAuthTokenExpiresAt = null;
        await client.save();

        if (botToken) {
          const successMsg = [
            `🎉 <b>Account Linked Successfully!</b>\n`,
            `Welcome <b>${client.name || username}</b>! Your Telegram account is now connected.\n`,
            `✅ <b>Status:</b> Active & Verified`,
            `📱 <b>Chat ID:</b> <code>${chatId}</code>`,
            `⏰ <b>Linked At:</b> ${this.formatTimeIST()}\n`,
            `You will automatically receive real-time trading signals and updates matching your active subscription plans directly here.`
          ].join('\n');
          await this.sendMessage(successMsg, { chatId, botToken, parseMode: 'HTML' });
        }

        console.log(`[TelegramService] Successfully linked client ${client.name} (${client._id}) with chatId: ${chatId}`);

        return {
          handled: true,
          action: 'LINK_SUCCESS',
          details: { clientId: client._id, name: client.name, chatId, username }
        };
      }

      return { handled: false };
    } catch (err: any) {
      console.error('[TelegramService] Error processing Telegram update:', err.message);
      return { handled: false, details: err.message };
    }
  }

  /**
   * Background polling loop for local development & continuous update ingestion
   */
  private pollerInterval: NodeJS.Timeout | null = null;
  private pollerOffset: number = 0;
  private isPolling: boolean = false;

  public startBotPoller(): void {
    if (this.pollerInterval) return;

    console.log('[TelegramService] Starting background Telegram bot poller...');
    this.pollerInterval = setInterval(async () => {
      if (this.isPolling) return;
      this.isPolling = true;
      try {
        const config = await this.getConfig();
        if (!config.botToken) {
          this.isPolling = false;
          return;
        }

        const url = `https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${this.pollerOffset}&limit=20&timeout=2`;
        const res = await axios.get(url, { timeout: 6000 });
        if (res.data?.ok && Array.isArray(res.data.result)) {
          for (const update of res.data.result) {
            this.pollerOffset = update.update_id + 1;
            await this.processTelegramUpdate(update);
          }
        }
      } catch (err: any) {
        // Silently ignore transient network poll issues
      } finally {
        this.isPolling = false;
      }
    }, 3500);
  }

  public stopBotPoller(): void {
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
  public async dispatchSignalToPlanAndSubscribers(
    payload: TelegramSignalPayload | TelegramSignalUpdatePayload,
    options: {
      signalId?: any;
      planId?: any;
      tenantId?: string;
      chatId?: string;
      botToken?: string;
      isUpdate?: boolean;
    }
  ): Promise<{
    channelDelivery?: { success: boolean; error?: string; messageId?: number; chatId?: string };
    directDeliveries?: Array<{ clientId: string; name: string; chatId: string; success: boolean; error?: string }>;
    totalSubscribersTargeted?: number;
    totalDelivered?: number;
  }> {
    const directDeliveries: Array<{ clientId: string; name: string; chatId: string; success: boolean; error?: string }> = [];
    let channelDelivery: { success: boolean; error?: string; messageId?: number; chatId?: string } | undefined;
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
        ? this.formatSignalUpdateMessage(payload as TelegramSignalUpdatePayload)
        : this.formatSignalMessage(payload as TelegramSignalPayload);

      // 2. Resolve tenant-specific models if tenantId provided
      let targetTenantModels: any = null;
      if (options.tenantId) {
        try {
          const tConn = await tenantConnectionManager.getTenantConnection(options.tenantId);
          if (tConn?.models) {
            targetTenantModels = tConn.models;
          }
        } catch {}
      }

      // Fetch Plan metadata if planId provided
      let plan: any = null;
      if (options.planId) {
        if (targetTenantModels?.Plan) {
          try {
            plan = await targetTenantModels.Plan.findById(options.planId).lean();
          } catch {}
        }
        if (!plan && dynamicDb?.Plan) {
          try {
            plan = await dynamicDb.Plan.findById(options.planId).lean();
          } catch {}
        }
        if (!plan && centralModels?.Plan) {
          try {
            plan = await centralModels.Plan.findById(options.planId).lean();
          } catch {}
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
            targetType: 'CHANNEL' as const,
            targetChatId: String(targetChatId),
            status: (chanRes.success ? 'DELIVERED' : 'FAILED') as 'DELIVERED' | 'FAILED',
            symbol: (payload as any).symbol,
            action: (payload as any).action || (payload as any).status,
            errorMessage: chanRes.error || null,
            telegramMessageId: chanMsgId,
            sentAt: new Date()
          };

          if (targetTenantModels?.TelegramDeliveryLog) {
            await targetTenantModels.TelegramDeliveryLog.create(logPayload as any);
          } else if (dynamicDb?.TelegramDeliveryLog) {
            await dynamicDb.TelegramDeliveryLog.create(logPayload as any);
          } else if (centralModels?.TelegramDeliveryLog) {
            await centralModels.TelegramDeliveryLog.create(logPayload as any);
          }
        } catch (logErr: any) {
          console.error('[TelegramService] Error saving channel delivery log:', logErr.message);
        }
      }

      // 5. STEP B: Send DMs to Active Plan Subscribers with Linked Telegram
      if (options.planId) {
        const now = new Date();
        let activeSubs: any[] = [];

        if (targetTenantModels?.Subscription) {
          try {
            activeSubs = await targetTenantModels.Subscription.find({
              planId: options.planId,
              status: 'ACTIVE',
              endDate: { $gte: now },
              deletedAt: null
            }).lean();
          } catch {}
        }
        if (activeSubs.length === 0 && dynamicDb?.Subscription) {
          try {
            activeSubs = await dynamicDb.Subscription.find({
              planId: options.planId,
              status: 'ACTIVE',
              endDate: { $gte: now },
              deletedAt: null
            }).lean();
          } catch {}
        }
        if (activeSubs.length === 0 && centralModels?.Subscription) {
          try {
            activeSubs = await centralModels.Subscription.find({
              planId: options.planId,
              status: 'ACTIVE',
              endDate: { $gte: now },
              deletedAt: null
            }).lean();
          } catch {}
        }

        const clientIds = Array.from(
          new Set(activeSubs.map((s: any) => s.clientId?.toString()).filter(Boolean))
        );

        if (clientIds.length > 0) {
          let subscribedClients: any[] = [];
          if (targetTenantModels?.Client) {
            try {
              subscribedClients = await targetTenantModels.Client.find({
                _id: { $in: clientIds },
                telegramChatId: { $ne: null },
                deletedAt: null
              }).lean();
            } catch {}
          }
          if (subscribedClients.length === 0 && dynamicDb?.Client) {
            try {
              subscribedClients = await dynamicDb.Client.find({
                _id: { $in: clientIds },
                telegramChatId: { $ne: null },
                deletedAt: null
              }).lean();
            } catch {}
          }
          if (subscribedClients.length === 0 && centralModels?.Client) {
            try {
              subscribedClients = await centralModels.Client.find({
                _id: { $in: clientIds },
                telegramChatId: { $ne: null },
                deletedAt: null
              }).lean();
            } catch {}
          }

          for (const client of subscribedClients) {
            if (!client.telegramChatId) continue;

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
                targetType: 'USER_DIRECT' as const,
                targetChatId: String(client.telegramChatId),
                recipientClientId: client._id,
                recipientUserId: client.userId || null,
                recipientName: client.name || client.email,
                recipientUsername: client.telegramUsername || null,
                status: (dmRes.success ? 'DELIVERED' : 'FAILED') as 'DELIVERED' | 'FAILED',
                symbol: (payload as any).symbol,
                action: (payload as any).action || (payload as any).status,
                errorMessage: dmRes.error || null,
                telegramMessageId: dmMsgId,
                sentAt: new Date()
              };

              if (targetTenantModels?.TelegramDeliveryLog) {
                await targetTenantModels.TelegramDeliveryLog.create(dmLogPayload as any);
              } else if (dynamicDb?.TelegramDeliveryLog) {
                await dynamicDb.TelegramDeliveryLog.create(dmLogPayload as any);
              } else if (centralModels?.TelegramDeliveryLog) {
                await centralModels.TelegramDeliveryLog.create(dmLogPayload as any);
              }
            } catch (logErr: any) {
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
    } catch (err: any) {
      console.error('[TelegramService] Error in dispatchSignalToPlanAndSubscribers:', err.message);
      return { totalDelivered: 0 };
    }
  }
}

export const telegramService = TelegramService.getInstance();
export default telegramService;


