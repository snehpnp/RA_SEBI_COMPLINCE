import axios from 'axios';

export interface TelegramSendOptions {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
  rawResponse?: any;
}

export interface BotTestResult {
  success: boolean;
  bot?: {
    id: number;
    firstName: string;
    username: string;
    canJoinGroups?: boolean;
    canReadAllGroupMessages?: boolean;
  };
  error?: string;
}

/**
 * Validates a Telegram bot token by querying Telegram's getMe endpoint.
 */
export async function testTelegramBot(botToken: string): Promise<BotTestResult> {
  const token = (botToken || '').trim();
  if (!token) {
    return { success: false, error: 'Telegram Bot Token is required.' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/getMe`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data && response.data.ok && response.data.result) {
      const b = response.data.result;
      return {
        success: true,
        bot: {
          id: b.id,
          firstName: b.first_name,
          username: b.username,
          canJoinGroups: b.can_join_groups,
          canReadAllGroupMessages: b.can_read_all_group_messages
        }
      };
    }

    return {
      success: false,
      error: response.data?.description || 'Failed to authenticate Telegram bot.'
    };
  } catch (err: any) {
    const errMsg = err.response?.data?.description || err.message || 'Error connecting to Telegram API';
    return { success: false, error: errMsg };
  }
}

/**
 * Sends a 1-on-1 direct message to a client using the company's Telegram Bot.
 */
export async function sendTelegramMessage(options: TelegramSendOptions): Promise<TelegramSendResult> {
  const { botToken, chatId, text, parseMode = 'HTML', disableWebPagePreview = true } = options;

  const token = (botToken || '').trim();
  const targetChatId = (chatId || '').trim();

  if (!token) {
    return { success: false, error: 'Telegram Bot Token is not configured.' };
  }
  if (!targetChatId) {
    return { success: false, error: 'Telegram Chat ID is missing.' };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: targetChatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview
    };

    const response = await axios.post(url, payload, {
      timeout: 12000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.ok) {
      return {
        success: true,
        messageId: response.data.result?.message_id,
        rawResponse: response.data.result
      };
    }

    return {
      success: false,
      error: response.data?.description || 'Telegram API returned non-OK response.'
    };
  } catch (err: any) {
    const errMsg = err.response?.data?.description || err.message || 'Network error sending Telegram message';
    return {
      success: false,
      error: errMsg,
      rawResponse: err.response?.data
    };
  }
}

/**
 * Formats a trade signal or trade update message for Telegram.
 */
export function formatTradeTelegramMessage(
  data: any,
  meta: {
    companyName?: string;
    sebiRegistration?: string;
    isUpdate?: boolean;
    isAlert?: boolean;
    updateStatus?: string;
    planName?: string;
  }
): string {
  const isAlert = Boolean(meta.isAlert || data?.action === 'TRADE_ALERT');
  const isUpdate = Boolean(meta.isUpdate);
  const company = meta.companyName || 'SEBI Registered Research Analyst';
  const sebiReg = meta.sebiRegistration ? `SEBI Reg: <b>${meta.sebiRegistration}</b>` : '';

  const stockSymbol = data?.stockSymbol || data?.symbol || 'STOCK';
  const segment = (data?.segment || 'CASH').toUpperCase();
  const callType = (data?.callType || 'BUY').toUpperCase();
  const tradeDuration = data?.tradeDuration || 'INTRADAY';

  if (isAlert) {
    const alertMsg = data?.alertMessage || data?.message || '';
    const planInfo = meta.planName ? `\n💼 <b>Service Plan:</b> ${meta.planName}` : '';
    return `🚨 <b>TRADE ALERT</b>
━━━━━━━━━━━━━━━━━━━━
🏢 <b>${company}</b>
${sebiReg ? `${sebiReg}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📊 <b>Symbol:</b> <code>${stockSymbol}</code> (${segment})${planInfo}
📢 <b>Alert:</b> ${alertMsg}

⚠️ <i>Notice: Please review your trade positions carefully.</i>`;
  }

  if (isUpdate) {
    const rawStatus = (meta.updateStatus || data?.closeStatus || 'CLOSED').toUpperCase();
    const statusText = data?.targetLabel ? `${data.targetLabel.toUpperCase()} ACHIEVED (${rawStatus})` : rawStatus;
    const exitPrice = data?.exitPrice ? `₹${data.exitPrice}` : 'N/A';
    const remark = data?.closeRemark ? `\n📝 <b>Remark:</b> ${data.closeRemark}` : '';

    return `🎯 <b>TRADE UPDATE ALERT</b>
━━━━━━━━━━━━━━━━━━━━
🏢 <b>${company}</b>
${sebiReg ? `${sebiReg}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📊 <b>Symbol:</b> <code>${stockSymbol}</code> (${segment})
⚡ <b>Status:</b> <b>${statusText}</b>
💰 <b>Exit Price:</b> ${exitPrice}
${remark}

⚠️ <i>Disclaimer: Investments in securities market are subject to market risks. Read all scheme related documents carefully before investing.</i>`;
  }

  // New Trade Signal
  const entryPrice = data?.entryPrice ? `₹${data.entryPrice}` : 'Market';
  const target1 = data?.target1 ? `₹${data.target1}` : 'N/A';
  const target2 = data?.target2 ? ` | T2: ₹${data.target2}` : '';
  const target3 = data?.target3 ? ` | T3: ₹${data.target3}` : '';
  const stoploss = data?.stoploss ? `₹${data.stoploss}` : 'N/A';
  const qty = data?.suggestedQuantity ? `\n📦 <b>Qty:</b> ${data.suggestedQuantity}` : '';
  const planInfo = meta.planName ? `\n💼 <b>Service Plan:</b> ${meta.planName}` : '';

  const actionEmoji = callType === 'BUY' ? '🟢' : '🔴';

  return `🚀 <b>NEW TRADE RECOMMENDATION</b>
━━━━━━━━━━━━━━━━━━━━
🏢 <b>${company}</b>
${sebiReg ? `${sebiReg}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📊 <b>Symbol:</b> <code>${stockSymbol}</code>
📌 <b>Segment:</b> ${segment}
${actionEmoji} <b>Action:</b> <b>${callType}</b>
⏳ <b>Duration:</b> ${tradeDuration}${planInfo}
━━━━━━━━━━━━━━━━━━━━
💵 <b>Entry Price:</b> <b>${entryPrice}</b>
🎯 <b>Target:</b> <b>${target1}</b>${target2}${target3}
🛑 <b>Stop Loss:</b> <b>${stoploss}</b>${qty}

⚠️ <i>Advisory: Please trade strictly with mentioned Stop Loss and Target to manage your capital risk. Past performance does not guarantee future results.</i>`;
}

/**
 * Registers a public HTTPS webhook URL with Telegram API for this bot.
 */
export async function registerTelegramWebhook(botToken: string, webhookUrl: string): Promise<{ success: boolean; description?: string }> {
  const token = (botToken || '').trim();
  const url = (webhookUrl || '').trim();
  if (!token) return { success: false, description: 'Bot token is missing' };
  if (!url) return { success: false, description: 'Webhook URL is missing' };

  try {
    const res = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
      url: url,
      allowed_updates: ['message', 'callback_query']
    }, { timeout: 10000 });

    return {
      success: Boolean(res.data?.ok),
      description: res.data?.description || (res.data?.ok ? 'Webhook registered successfully' : 'Failed to set webhook')
    };
  } catch (err: any) {
    return {
      success: false,
      description: err.response?.data?.description || err.message || 'Error setting webhook'
    };
  }
}

/**
 * Checks current webhook info for the bot.
 */
export async function getTelegramWebhookInfo(botToken: string): Promise<any> {
  const token = (botToken || '').trim();
  if (!token) return { success: false, error: 'Bot token is missing' };

  try {
    const res = await axios.get(`https://api.telegram.org/bot${token}/getWebhookInfo`, { timeout: 10000 });
    return {
      success: Boolean(res.data?.ok),
      data: res.data?.result
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.description || err.message || 'Error getting webhook info'
    };
  }
}

