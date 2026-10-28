import axios from 'axios';
import dynamicDb, { centralModels } from '../config/db';
import { processTelegramUpdate } from '../controllers/telegramController';

const offsetsByToken = new Map<string, number>();
let isPollingActive = false;
let pollingIntervalRef: any = null;

/**
 * Polls Telegram getUpdates for all configured tenant bots.
 * Enables instant 1-click connect in local development and production environments
 * without requiring external HTTPS webhooks or ngrok tunnels.
 */
async function pollTenantBots() {
  if (isPollingActive) return;
  isPollingActive = true;

  try {
    // Find all tenants that have a Telegram Bot Token configured
    const tenants: any[] = await dynamicDb.Tenant.find({
      telegramBotToken: { $exists: true, $ne: null, $nin: ['', 'NONE'] },
      telegramTradeEnabled: true
    }).lean();

    for (const tenant of tenants) {
      const token = (tenant.telegramBotToken || '').trim();
      if (!token) continue;

      const currentOffset = offsetsByToken.get(token) || 0;

      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${currentOffset}&timeout=0&limit=20`;
        const resp = await axios.get(url, { timeout: 8000 });

        if (resp.data && resp.data.ok && Array.isArray(resp.data.result)) {
          const updates = resp.data.result;
          for (const upd of updates) {
            const updateId = upd.update_id;
            offsetsByToken.set(token, updateId + 1);

            // Process the update (links client, sends welcome message, etc.)
            await processTelegramUpdate(upd, token);
          }
        }
      } catch (err: any) {
        // If Telegram returns 409 Conflict, it means a webhook is currently active on Telegram servers
        // In that case, the webhook receives updates, so polling can silently skip
        const status = err.response?.status;
        if (status === 409) {
          // Webhook is active for this bot; webhook handles it
        } else {
          // Transient network error or invalid token
        }
      }
    }
  } catch (err: any) {
    // DB or general error
  } finally {
    isPollingActive = false;
  }
}

/**
 * Starts the Telegram background poller.
 */
export function initTelegramPoller() {
  if (pollingIntervalRef) return;
  console.log('🤖 [Telegram Poller] Initialized auto-poller service for instant 1-click bot connects.');

  // Run once immediately after 2 seconds, then every 3 seconds
  setTimeout(() => {
    pollTenantBots();
    pollingIntervalRef = setInterval(pollTenantBots, 3000);
  }, 2000);
}
