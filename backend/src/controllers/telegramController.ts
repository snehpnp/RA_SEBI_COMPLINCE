import { Request, Response } from 'express';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendTelegramMessage, registerTelegramWebhook, getTelegramWebhookInfo } from '../services/telegramService';
import { getResolvedTenant } from './clientController';

/**
 * Public webhook endpoint called by Telegram when any user messages the bot.
 * Route: POST /api/v1/public/telegram/webhook/:tokenOrTenant?
 */
/**
 * Processes an individual update received from Telegram (via Webhook or Polling).
 */
export const processTelegramUpdate = async (update: any, tokenOrTenant?: string) => {
  try {
    if (!update || !update.message) return;

    const message = update.message;
    const rawText = (message.text || '').trim();
    const chatId = String(message.chat?.id || '');
    const username = (message.from?.username || message.chat?.username || '').replace(/^@/, '');
    const firstName = message.from?.first_name || message.chat?.first_name || 'Trader';

    if (!chatId) return;

    // We only process if it is a command or text
    if (rawText.startsWith('/start') || rawText.startsWith('/connect') || rawText.startsWith('/link')) {
      const parts = rawText.split(/\s+/);
      const payload = parts.length > 1 ? parts[1].trim() : '';

      let clientMatch: any = null;
      let tenantMatch: any = null;

      if (payload) {
        // Strip common prefixes like link_, client_, sub_
        const cleanPayload = payload.replace(/^(link_|client_|sub_)/i, '');

        if (mongoose.Types.ObjectId.isValid(cleanPayload)) {
          // Direct client document ID or user ID
          clientMatch = await dynamicDb.Client.findById(cleanPayload);
          if (!clientMatch) {
            clientMatch = await dynamicDb.Client.findOne({ userId: cleanPayload });
          }
        } else if (/^\d{10}$/.test(cleanPayload)) {
          // 10-digit mobile number
          clientMatch = await dynamicDb.Client.findOne({ mobile: cleanPayload });
        }
      }

      // If client is found, bind Chat ID and username automatically!
      if (clientMatch) {
        tenantMatch = await dynamicDb.Tenant.findById(clientMatch.tenantId).lean();
        if (!tenantMatch) {
          tenantMatch = await centralModels.Tenant.findById(clientMatch.tenantId).lean();
        }

        const botToken = tenantMatch?.telegramBotToken;
        const companyName = tenantMatch?.companyName || 'SEBI Registered Research Analyst';
        const telegramJoinRule = tenantMatch?.telegramJoinRule || 'ACTIVE_PLAN_ONLY';

        // 1. Mandatory Check: Client must have an active paid subscription plan
        const now = new Date();
        const activeSub = await dynamicDb.Subscription.findOne({
          $or: [{ clientId: clientMatch._id }, { clientId: clientMatch.userId }],
          status: 'ACTIVE',
          endDate: { $gte: now }
        }).lean();

        if (!activeSub) {
          if (botToken) {
            const planRequiredMsg = `⚠️ <b>Active Subscription Plan Required</b>
━━━━━━━━━━━━━━━━━━━━
👋 Hello <b>${clientMatch.name}</b>,

Your account does not currently have an active paid subscription plan.

Telegram trade alerts are exclusively available for active plan holders. Please purchase or renew a subscription plan on your client dashboard to link Telegram alerts. 🚀

🆔 <b>Chat ID:</b> <code>${chatId}</code>`;
            await sendTelegramMessage({
              botToken,
              chatId,
              text: planRequiredMsg,
              parseMode: 'HTML'
            }).catch((err) => console.error('Error sending active plan warning telegram message:', err));
          }
          return;
        }

        // 2. Compliance Check: If rule is KYC_AGREEMENT_VERIFIED, check KYC & Agreement
        if (telegramJoinRule === 'KYC_AGREEMENT_VERIFIED') {
          const isKraVerified = Boolean(
            clientMatch.kraVerified === true ||
            clientMatch.kycStatus === 'VERIFIED' ||
            clientMatch.kycStatus === 'APPROVED'
          );
          const signedAgreement = await dynamicDb.Agreement.findOne({
            $or: [{ clientId: clientMatch._id }, { clientId: clientMatch.userId }],
            status: { $in: ['SIGNED', 'ACTIVE'] }
          }).lean();

          if (!isKraVerified || !signedAgreement) {
            if (botToken) {
              const kycRequiredMsg = `⚠️ <b>KYC &amp; Agreement Required (SEBI Compliance)</b>
━━━━━━━━━━━━━━━━━━━━
👋 Hello <b>${clientMatch.name}</b>,

Under SEBI regulations, client verification is mandatory before trade alerts can be activated.

Please complete your <b>DigiLocker KYC</b> and sign the <b>SEBI Service Agreement</b> on your client portal. Once completed, your Telegram connection will be automatically activated! ⚡

🆔 <b>Chat ID:</b> <code>${chatId}</code>`;
              await sendTelegramMessage({
                botToken,
                chatId,
                text: kycRequiredMsg,
                parseMode: 'HTML'
              }).catch((err) => console.error('Error sending kyc required telegram message:', err));
            }
            return;
          }
        }

        // All checks satisfied! Bind Chat ID and username automatically
        clientMatch.telegramChatId = chatId;
        if (username) {
          clientMatch.telegramUsername = username;
        }
        clientMatch.isTelegramTradeEnabled = true;
        await clientMatch.save();

        if (botToken) {
          const welcomeMsg = `🎉 <b>Telegram Trade Alerts Connected!</b>
━━━━━━━━━━━━━━━━━━━━
👋 Hello <b>${clientMatch.name}</b>,

Your Telegram account is now successfully linked to <b>${companyName}</b>.

✅ <b>Status:</b> Active &amp; Ready
🆔 <b>Chat ID:</b> <code>${chatId}</code>
👤 <b>Handle:</b> @${username || 'N/A'}

You will now receive all live trade recommendations, entry/target levels, and stop loss updates for your active subscribed plans directly in this chat! 🚀

⚠️ <i>Disclaimer: Always trade with strict stop loss and capital management.</i>`;

          await sendTelegramMessage({
            botToken,
            chatId,
            text: welcomeMsg,
            parseMode: 'HTML'
          }).catch((err) => console.error('Error sending welcome telegram message:', err));
        }
        return;
      }

      // If no valid client payload provided, provide the user with their Chat ID and instructions
      let fallbackTenant: any = null;
      if (tokenOrTenant) {
        fallbackTenant = await dynamicDb.Tenant.findOne({
          $or: [
            { telegramBotToken: tokenOrTenant },
            ...(mongoose.Types.ObjectId.isValid(tokenOrTenant) ? [{ _id: tokenOrTenant }] : [])
          ]
        }).lean();
      }
      if (!fallbackTenant) {
        fallbackTenant = await dynamicDb.Tenant.findOne({
          telegramBotToken: { $exists: true, $ne: '' }
        }).lean();
      }

      const botToken = fallbackTenant?.telegramBotToken;
      const companyName = fallbackTenant?.companyName || 'SEBI Registered Research Analyst';

      if (botToken) {
        const infoMsg = `👋 <b>Welcome to ${companyName} Alerts Bot!</b>
━━━━━━━━━━━━━━━━━━━━
Your Telegram Chat ID is:
👉 <code>${chatId}</code> <i>(tap to copy)</i>

<b>How to link with your account:</b>
1️⃣ Open your <b>Client Dashboard</b>.
2️⃣ Click <b>Connect Telegram Bot ⚡</b> to connect in 1 click!`;

        await sendTelegramMessage({
          botToken,
          chatId,
          text: infoMsg,
          parseMode: 'HTML'
        }).catch((err) => console.error('Error sending info telegram message:', err));
      }
    }
  } catch (error) {
    console.error('Error in processTelegramUpdate:', error);
  }
};

/**
 * Public webhook endpoint called by Telegram when any user messages the bot.
 * Route: POST /api/v1/public/telegram/webhook/:tokenOrTenant?
 */
export const handleTelegramWebhook = async (req: Request, res: Response) => {
  // Always return 200 OK immediately to satisfy Telegram's webhook requirements
  res.status(200).json({ ok: true });

  try {
    await processTelegramUpdate(req.body, req.params.tokenOrTenant);
  } catch (error) {
    console.error('Error in handleTelegramWebhook:', error);
  }
};

/**
 * Admin action to automatically register the webhook with Telegram API.
 * Route: POST /api/v1/admin/telegram/set-webhook
 */
export const setTelegramWebhookEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const tenant: any = await dynamicDb.Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found.' });
    }

    const botToken = req.body?.botToken || tenant.telegramBotToken;
    if (!botToken || !botToken.trim()) {
      return res.status(400).json({ success: false, message: 'Telegram Bot Token is required.' });
    }

    // Determine the public URL of the backend
    const publicUrl = req.body?.webhookUrl || process.env.BACKEND_PUBLIC_URL || process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const cleanBaseUrl = publicUrl.replace(/\/+$/, '');
    const webhookUrl = `${cleanBaseUrl}/api/v1/public/telegram/webhook/${tenant._id}`;

    const regResult = await registerTelegramWebhook(botToken.trim(), webhookUrl);

    if (regResult.success) {
      return res.status(200).json({
        success: true,
        message: `Telegram Webhook registered successfully!`,
        webhookUrl
      });
    } else {
      return res.status(400).json({
        success: false,
        message: regResult.description || 'Failed to register webhook with Telegram.'
      });
    }
  } catch (error: any) {
    console.error('Error registering Telegram webhook:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error registering webhook.' });
  }
};

/**
 * Admin action to check current Telegram webhook status.
 * Route: GET /api/v1/admin/telegram/webhook-info
 */
export const getTelegramWebhookStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const tenant: any = await dynamicDb.Tenant.findById(tenantId).lean();
    const botToken = tenant?.telegramBotToken;

    if (!botToken) {
      return res.status(400).json({ success: false, message: 'No Bot Token configured.' });
    }

    const info = await getTelegramWebhookInfo(botToken);
    return res.status(200).json({ success: true, ...info });
  } catch (error: any) {
    console.error('Error getting webhook info:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
